// 云函数：publishProduct
// 发布 / 更新内容
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { action, product } = event;
  // action: 'add' | 'update' | 'delete' | 'toggleStatus'
  // product: { _id?, title, images, desc, publisher, status }

  try {
    switch (action) {
      case 'add': {
        // 查询用户角色
        const userRes = await db.collection('users').where({ _openid: openid }).get();
        const role = (userRes.data && userRes.data[0] && userRes.data[0].role) || 'user';
        const status = role === 'admin' ? 'on' : 'pending';
        const data = {
          ...product,
          _openid: openid,
          status,
          viewCount: 0,
          publishTime: db.serverDate(),
          createTime: db.serverDate()
        };
        const res = await db.collection('products').add({ data });
        if (role === 'admin') {
          return { code: 0, msg: '发布成功', id: res._id };
        } else {
          return { code: 0, msg: '已提交审核，请等待管理员审核', id: res._id };
        }
      }
      case 'update': {
        const { _id, ...updateData } = product;
        await db.collection('products').doc(_id).update({ data: updateData });
        return { code: 0, msg: '更新成功' };
      }
      case 'approve': {
        await db.collection('products').doc(event.productId).update({
          data: { status: 'on' }
        });
        return { code: 0, msg: '审核通过' };
      }
      case 'reject': {
        await db.collection('products').doc(event.productId).remove();
        return { code: 0, msg: '已拒绝' };
      }
      case 'delete': {
        await db.collection('products').doc(event.productId).remove();
        return { code: 0, msg: '删除成功' };
      }
      case 'toggleStatus': {
        const prod = await db.collection('products').doc(event.productId).get();
        const newStatus = prod.data.status === 'on' ? 'off' : 'on';
        await db.collection('products').doc(event.productId).update({
          data: { status: newStatus }
        });
        return { code: 0, msg: newStatus === 'on' ? '已公开' : '已隐藏', status: newStatus };
      }
      default:
        return { code: -1, msg: '未知操作' };
    }
  } catch (err) {
    console.error(err);
    return { code: -1, msg: err.message };
  }
};