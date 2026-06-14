const app = getApp();

Page({
  data: {
    loading: false,
    avatarUrl: '',
    nickName: ''
  },

  onLoad() {
    // 如果已有登录态，直接跳转
    if (app.globalData.isLoggedIn && app.globalData.role) {
      this.navigateByRole();
      return;
    }
    // 尝试读取本地缓存的头像昵称
    const cachedUser = wx.getStorageSync('userInfo');
    if (cachedUser) {
      this.setData({
        avatarUrl: cachedUser.avatarUrl || '',
        nickName: cachedUser.nickName || ''
      });
    }
  },

  // 选择微信头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;
    this.setData({ avatarUrl });
  },

  // 输入昵称
  onNickNameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  // 上传头像到云存储
  uploadAvatar(tempPath) {
    return wx.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}.jpg`,
      filePath: tempPath
    }).then(res => res.fileID).catch(() => '/images/default-avatar.png');
  },

  handleLogin() {
    const { avatarUrl, nickName } = this.data;
    if (!avatarUrl) {
      wx.showToast({ title: '请先点击头像同步', icon: 'none' });
      return;
    }

    const that = this;
    this.setData({ loading: true });

    // 先上传头像到云存储
    const uploadTask = avatarUrl.startsWith('http://tmp') || avatarUrl.startsWith('wxfile://')
      ? this.uploadAvatar(avatarUrl)
      : Promise.resolve(avatarUrl);

    uploadTask.then(cloudAvatarUrl => {
      const userInfo = {
        nickName: nickName || '校园同学',
        avatarUrl: cloudAvatarUrl
      };
      app.globalData.userInfo = userInfo;

      return wx.cloud.callFunction({
        name: 'getUserRole',
        data: {}
      }).then(roleRes => {
        const result = roleRes.result || {};
        const role = result.role || 'user';
        const openid = result.openid || '';

        app.globalData.role = role;
        app.globalData.openid = openid;
        app.globalData.isLoggedIn = true;

        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('role', role);

        // 同步用户信息到数据库（包含头像）
        app.syncUserToCloud(userInfo);

        that.setData({ loading: false });
        wx.showToast({ title: '登录成功', icon: 'success', duration: 1500 });
        setTimeout(() => {
          that.navigateByRole();
        }, 1500);
      });
    }).catch(err => {
      console.error('登录失败:', err);
      that.setData({ loading: false });
      wx.showToast({ title: '登录出错，请重试', icon: 'none' });
    });
  },

  navigateByRole() {
    wx.switchTab({ url: '/pages/wall/index' });
  },

  // 头像加载失败回退
  onAvatarError() {
    this.setData({ avatarUrl: '/images/default-avatar.png' });
  },

  skipLogin() {
    app.globalData.role = 'user';
    app.globalData.isLoggedIn = true;
    wx.setStorageSync('role', 'user');
    wx.switchTab({ url: '/pages/wall/index' });
  }
});
