// 云函数：toggleFavorite
// 切换收藏状态
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { productId } = event;

  try {
    // 查是否已收藏
    const exist = await db.collection('favorites').where({
      _openid: openid,
      productId
    }).get();

    if (exist.data.length > 0) {
      // 取消收藏
      await db.collection('favorites').doc(exist.data[0]._id).remove();
      return { code: 0, favorited: false, msg: '已取消收藏' };
    } else {
      // 添加收藏
      await db.collection('favorites').add({
        data: {
          _openid: openid,
          productId,
          createTime: db.serverDate()
        }
      });
      return { code: 0, favorited: true, msg: '收藏成功' };
    }
  } catch (err) {
    console.error(err);
    return { code: -1, msg: err.message };
  }
};