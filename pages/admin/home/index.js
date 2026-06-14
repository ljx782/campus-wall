const app = getApp();

Page({
  data: {
    role: 'admin',
    wallPendingList: [],
    wallLoading: false
  },

  onShow() {
    this.loadWallPending();
  },

  onPullDownRefresh() {
    this.loadWallPending();
    wx.stopPullDownRefresh();
  },

  // 加载待审核的校园墙帖子
  loadWallPending() {
    const that = this;
    this.setData({ wallLoading: true });
    wx.cloud.callFunction({
      name: 'campusWall',
      data: {
        action: 'list',
        statusFilter: 'pending',
        page: 1,
        pageSize: 50,
        sortBy: 'publishTime',
        sortOrder: 'desc'
      }
    }).then(res => {
      const result = res.result || {};
      if (result.code === 0) {
        that.setData({
          wallPendingList: result.data.list || [],
          wallLoading: false
        });
      } else {
        that.setData({ wallLoading: false });
      }
    }).catch(err => {
      console.error(err);
      that.setData({ wallLoading: false });
    });
  },

  // 审核通过校园墙帖子
  approveWallPost(e) {
    const that = this;
    const postId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '审核通过',
      content: '确认通过该内容审核？通过后将在广场展示。',
      success: (modalRes) => {
        if (modalRes.confirm) {
          wx.cloud.callFunction({
            name: 'campusWall',
            data: { action: 'approve', postId }
          }).then(res => {
            const result = res.result || {};
            if (result.code === 0) {
              wx.showToast({ title: result.msg, icon: 'success' });
              that.loadWallPending();
            } else {
              wx.showToast({ title: result.msg, icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 拒绝校园墙帖子
  rejectWallPost(e) {
    const that = this;
    const postId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '拒绝',
      content: '确认拒绝该内容？将永久删除。',
      confirmColor: '#FF3B30',
      success: (modalRes) => {
        if (modalRes.confirm) {
          wx.cloud.callFunction({
            name: 'campusWall',
            data: { action: 'reject', postId }
          }).then(res => {
            const result = res.result || {};
            if (result.code === 0) {
              wx.showToast({ title: result.msg, icon: 'success' });
              that.loadWallPending();
            } else {
              wx.showToast({ title: result.msg, icon: 'none' });
            }
          });
        }
      }
    });
  },

});