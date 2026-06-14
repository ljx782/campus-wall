// 云函数：getUserRole
// 获取当前用户的角色信息，用于前端分流
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 查询用户记录
    const userRes = await db.collection('users').where({ _openid: openid }).get();

    if (userRes.data.length === 0) {
      // 新用户，自动创建 user 角色记录
      await db.collection('users').add({
        data: {
          _openid: openid,
          nickName: '',
          avatarUrl: '',
          role: 'user',
          createTime: db.serverDate()
        }
      });
      return { openid, role: 'user', isNew: true };
    }

    return {
      openid,
      role: userRes.data[0].role || 'user',
      userInfo: {
        nickName: userRes.data[0].nickName,
        avatarUrl: userRes.data[0].avatarUrl
      }
    };
  } catch (err) {
    console.error(err);
    return { openid, role: 'user', error: err.message };
  }
};