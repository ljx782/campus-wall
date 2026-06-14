// 云函数：getProducts
// 获取物品列表，支持分页、分类筛选、搜索
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
  const {
    page = 1,
    pageSize = 10,
    category = '',
    keyword = '',
    status = '',
    myOnly = false,
    sortBy = 'publishTime',
    sortOrder = 'desc'
  } = event;

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (myOnly) {
      where._openid = openid;
    }
    if (category) {
      where.category = category;
    }
    if (keyword) {
      where.title = db.RegExp({ regexp: keyword, options: 'i' });
    }

    const countRes = await db.collection('products').where(where).count();
    const total = countRes.total;

    const listRes = await db.collection('products')
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
  } catch (err) {
    console.error(err);
    return { code: -1, msg: err.message };
  }
};