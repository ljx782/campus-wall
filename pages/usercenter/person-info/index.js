import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    personInfo: {
      avatarUrl: '',
      nickName: '',
      gender: 0,
    },
    tempAvatar: '', // 临时头像路径，需上传
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      personInfo: {
        avatarUrl: userInfo.avatarUrl || '',
        nickName: userInfo.nickName || '',
        gender: userInfo.gender || 0,
      }
    });
  },

  // 选择微信头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;
    this.setData({
      'personInfo.avatarUrl': avatarUrl,
      tempAvatar: avatarUrl
    });
  },

  onNameInput(e) {
    this.setData({ 'personInfo.nickName': e.detail.value });
  },

  setGender(e) {
    this.setData({ 'personInfo.gender': parseInt(e.currentTarget.dataset.g) });
  },

  // 头像加载失败回退
  onAvatarError() {
    this.setData({ 'personInfo.avatarUrl': '/images/default-avatar.png' });
  },

  // 上传头像到云存储
  uploadAvatar(tempPath) {
    if (!tempPath || (!tempPath.startsWith('http://tmp') && !tempPath.startsWith('wxfile://'))) {
      return Promise.resolve(tempPath);
    }
    return wx.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}.jpg`,
      filePath: tempPath
    }).then(res => res.fileID).catch(() => '/images/default-avatar.png');
  },

  save() {
    const { personInfo, tempAvatar } = this.data;
    if (!personInfo.nickName.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    this.uploadAvatar(tempAvatar).then(avatarUrl => {
      const userInfo = {
        nickName: personInfo.nickName.trim(),
        avatarUrl: avatarUrl || personInfo.avatarUrl,
        gender: personInfo.gender
      };

      // 更新本地缓存
      wx.setStorageSync('userInfo', userInfo);

      // 更新全局数据
      const app = getApp();
      app.globalData.userInfo = userInfo;

      // 同步到数据库
      if (app.globalData.openid) {
        app.syncUserToCloud(userInfo);
      }

      wx.hideLoading();
      Toast({
        context: this,
        selector: '#t-toast',
        message: '保存成功',
        theme: 'success',
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(err);
    });
  }
});
