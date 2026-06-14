const app = getApp();

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    role: 'user',
    myItemCount: 0,
    likedCount: 0,
    isAdmin: false,
    hasPendingReview: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().init();
    }
    this.loadUserInfo();
    this.loadStats();
  },

  loadUserInfo() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    const role = app.globalData.role || wx.getStorageSync('role') || 'user';
    const isAdmin = role === 'admin';

    if (userInfo && userInfo.nickName) {
      this.setData({ userInfo, role, isAdmin });
    }
  },

  loadStats() {
    const that = this;
    const db = app.globalData.db;
    const openid = app.globalData.openid || '';
    const isAdmin = this.data.isAdmin;

    Promise.all([
      db.collection('products').where({ _openid: openid }).count(),
      db.collection('campus_posts').where({ _openid: openid }).count()
    ]).then(([prodRes, postRes]) => {
      that.setData({ myItemCount: (prodRes.total || 0) + (postRes.total || 0) });
    }).catch(() => {});

    db.collection('campus_posts').where({ likedOpenids: openid }).count().then(res => {
      that.setData({ likedCount: res.total || 0 });
    }).catch(() => {});

    if (isAdmin) {
      Promise.all([
        db.collection('products').where({ status: 'pending' }).count(),
        db.collection('campus_posts').where({ status: 'pending' }).count()
      ]).then(([prodPending, wallPending]) => {
        const totalPending = (prodPending.total || 0) + (wallPending.total || 0);
        that.setData({ hasPendingReview: totalPending > 0 });
        if (totalPending > 0) {
          wx.showToast({
            title: `有 ${totalPending} 条内容待审核`,
            icon: 'none',
            duration: 3000
          });
        }
      }).catch(() => {});
    }
  },

  login() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      // 未登录，跳转登录页
      wx.reLaunch({ url: '/pages/login/index' });
    } else {
      // 已登录，跳转编辑资料
      wx.navigateTo({ url: '/pages/usercenter/person-info/index' });
    }
  },

  navToEditProfile() {
    wx.navigateTo({ url: '/pages/usercenter/person-info/index' });
  },

  navToMyItems() {
    if (this.data.isAdmin) {
      wx.navigateTo({ url: '/pages/admin/home/index' });
    } else {
      wx.navigateTo({ url: '/pages/goods/list/index?myOnly=1' });
    }
  },

  navToFavs() {
    wx.navigateTo({ url: '/pages/usercenter/favorites/index' });
  },

  navToAdmin() {
    wx.navigateTo({ url: '/pages/admin/home/index' });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.userInfo = null;
          app.globalData.role = '';
          app.globalData.isLoggedIn = false;
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('role');
          wx.reLaunch({ url: '/pages/login/index' });
        }
      }
    });
  },

  // 头像加载失败回退
  onAvatarError() {
    this.setData({ 'userInfo.avatarUrl': '/images/default-avatar.png' });
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '缓存已清除', icon: 'success' });
        }
      }
    });
  },

  showAbout() {
    wx.showModal({
      title: '关于校园信息展示墙',
      content: '校园信息展示墙 v3.0.0\n表白墙 · 好物推荐 · 学习经验 · 失物招领\n连接校园生活的每一个角落。',
      showCancel: false
    });
  }
});