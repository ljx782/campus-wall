// 云函数：campusWall
// 校园墙发布 / 获取列表 / 详情 / 删除（表白墙、学习经验、失物招领）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 递归收集所有 cloud:// 文件 ID 并替换为临时 HTTPS 链接
// getTempFileURL 单次最多 50 个，自动分批处理，URL 有效期 7 天
async function resolveFileUrls(data) {
  if (!data) return data;

  const fileIds = new Set();
  function collectIds(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(function (item) { collectIds(item); });
      return;
    }
    for (var key of Object.keys(obj)) {
      var val = obj[key];
      if (typeof val === 'string' && val.indexOf('cloud://') === 0) {
        fileIds.add(val);
      } else if (typeof val === 'object' && val !== null) {
        collectIds(val);
      }
    }
  }

  collectIds(data);
  if (fileIds.size === 0) return data;

  var allFileIds = Array.from(fileIds);
  var urlMap = {};
  var batchSize = 50;

  for (var i = 0; i < allFileIds.length; i += batchSize) {
    var batch = allFileIds.slice(i, i + batchSize);
    try {
      var result = await cloud.getTempFileURL({
        fileList: batch.map(function (id) { return { fileID: id, maxAge: 86400 * 7 }; })
      });
      (result.fileList || []).forEach(function (file) {
        if (file.tempFileURL) {
          urlMap[file.fileID] = file.tempFileURL;
        } else {
          console.warn('getTempFileURL no URL for:', file.fileID, file.status);
        }
      });
    } catch (e) {
      console.error('getTempFileURL batch failed:', e);
    }
  }

  if (Object.keys(urlMap).length === 0) return data;

  function replaceUrls(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(function (item) { replaceUrls(item); });
      return;
    }
    for (var key of Object.keys(obj)) {
      var val = obj[key];
      if (typeof val === 'string' && urlMap[val]) {
        obj[key] = urlMap[val];
      } else if (typeof val === 'object' && val !== null) {
        replaceUrls(val);
      }
    }
  }

  replaceUrls(data);
  return data;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { action, post, postId, type, keyword, page = 1, pageSize = 10, sortBy = 'publishTime', sortOrder = 'desc' } = event;

  try {
    switch (action) {
      case 'add': {
        // 查询用户角色
        const userRes = await db.collection('users').where({ _openid: openid }).get();
        const role = (userRes.data && userRes.data[0] && userRes.data[0].role) || 'user';
        const status = role === 'admin' ? 'on' : 'pending';
        const data = {
          ...post,
          _openid: openid,
          status,
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          publishTime: db.serverDate(),
          createTime: db.serverDate()
        };
        const res = await db.collection('campus_posts').add({ data });
        if (role === 'admin') {
          return { code: 0, msg: '发布成功', id: res._id };
        } else {
          return { code: 0, msg: '已提交审核，请等待管理员审核', id: res._id };
        }
      }
      case 'update': {
        const { _id, ...updateData } = post;
        await db.collection('campus_posts').doc(_id).update({ data: updateData });
        return { code: 0, msg: '更新成功' };
      }
      case 'approve': {
        await db.collection('campus_posts').doc(postId).update({
          data: { status: 'on' }
        });
        return { code: 0, msg: '审核通过' };
      }
      case 'reject': {
        await db.collection('campus_posts').doc(postId).remove();
        return { code: 0, msg: '已拒绝' };
      }
      case 'delete': {
        await db.collection('campus_posts').doc(postId).remove();
        return { code: 0, msg: '删除成功' };
      }
      case 'list': {
        const where = {};
        if (event.statusFilter) {
          where.status = event.statusFilter;
        } else {
          where.status = 'on';
        }
        if (type) where.type = type;
        if (keyword) {
          where.title = db.RegExp({ regexp: keyword, options: 'i' });
        }

        const countRes = await db.collection('campus_posts').where(where).count();
        const total = countRes.total;

        const listRes = await db.collection('campus_posts')
          .where(where)
          .orderBy(sortBy, sortOrder)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get();

        await resolveFileUrls(listRes.data);

        return {
          code: 0,
          data: {
            list: listRes.data,
            total,
            page,
            pageSize,
            hasMore: page * pageSize < total
          }
        };
      }
      case 'detail': {
        const res = await db.collection('campus_posts').doc(postId).get();
        if (!res.data) return { code: -1, msg: '内容不存在' };
        await resolveFileUrls(res.data);
        db.collection('campus_posts').doc(postId).update({
          data: { viewCount: db.command.inc(1) }
        }).catch(() => {});
        return { code: 0, data: res.data };
      }
      case 'like': {
        const postDoc = await db.collection('campus_posts').doc(postId).get();
        const liked = postDoc.data.likedOpenids || [];
        const hasLiked = liked.includes(openid);
        const newLiked = hasLiked ? liked.filter(id => id !== openid) : liked.concat(openid);
        await db.collection('campus_posts').doc(postId).update({
          data: {
            likedOpenids: newLiked,
            likeCount: newLiked.length
          }
        });
        return { code: 0, liked: !hasLiked, likeCount: newLiked.length };
      }
      default:
        return { code: -1, msg: '未知操作' };
    }
  } catch (err) {
    console.error(err);
    return { code: -1, msg: err.message };
  }
};
