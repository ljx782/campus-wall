const app = getApp();

Page({
  data: {
    publishType: 'confession',
    typeList: [
      { type: 'confession', name: '表白墙', icon: '💌' },
      { type: 'secondhand', name: '好物推荐', icon: '🌟' },
      { type: 'study', name: '学习经验', icon: '📚' },
      { type: 'lostfound', name: '失物招领', icon: '🔍' }
    ],

    // 通用
    images: [],
    cloudImageIds: [],
    contact: '',

    // 表白墙
    toName: '',
    fromName: '',
    content: '',

    // 好物推荐
    title: '',
    desc: '',

    // 失物招领
    lostStatus: 'lost',
    itemName: '',
    location: '',
    lostTime: '',

    submitting: false,
    isAdmin: false
  },

  onShow() {
    const role = app.globalData.role || wx.getStorageSync('role') || 'user';
    this.setData({ isAdmin: role === 'admin' });
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().init();
    }
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ publishType: type });
  },

  chooseImage() {
    const that = this;
    const remain = 6 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 6 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempPaths = res.tempFiles.map(f => f.tempFilePath);
        that.uploadImages(tempPaths);
      }
    });
  },

  uploadImages(tempPaths) {
    const that = this;
    wx.showLoading({ title: '上传图片中...' });
    const uploadTasks = tempPaths.map((path, i) => {
      return wx.cloud.uploadFile({
        cloudPath: 'posts/' + Date.now() + '_' + i + '.jpg',
        filePath: path
      });
    });
    Promise.all(uploadTasks).then(results => {
      wx.hideLoading();
      const newImageIds = results.map(r => r.fileID);
      that.setData({
        images: that.data.images.concat(newImageIds),
        cloudImageIds: that.data.cloudImageIds.concat(newImageIds)
      });
      wx.showToast({ title: '上传成功', icon: 'success', duration: 1000 });
    }).catch(err => {
      wx.hideLoading();
      console.error('上传失败:', err);
      wx.showToast({ title: '图片上传失败', icon: 'none' });
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    const cloudImageIds = this.data.cloudImageIds;
    images.splice(index, 1);
    cloudImageIds.splice(index, 1);
    this.setData({ images, cloudImageIds });
  },

  onToNameInput(e) { this.setData({ toName: e.detail.value }); },
  onFromNameInput(e) { this.setData({ fromName: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onDescInput(e) { this.setData({ desc: e.detail.value }); },
  onLostStatusTap(e) { this.setData({ lostStatus: e.currentTarget.dataset.value }); },
  onItemNameInput(e) { this.setData({ itemName: e.detail.value }); },
  onLocationInput(e) { this.setData({ location: e.detail.value }); },
  onLostTimeInput(e) { this.setData({ lostTime: e.detail.value }); },
  onContactInput(e) { this.setData({ contact: e.detail.value }); },

  // 图片加载失败回退
  onImageError(e) {
    var index = e.currentTarget.dataset.index;
    var key = 'images[' + index + ']';
    this.setData({ [key]: '/images/demo1.png' });
  },

  getRole() {
    return app.globalData.role || wx.getStorageSync('role') || 'user';
  },

  isAdmin() {
    return this.getRole() === 'admin';
  },

  checkImages(images) {
    if (!images || images.length === 0) return true;
    const invalid = images.filter(url => typeof url !== 'string' || !/^cloud:\/\//.test(url));
    if (invalid.length > 0) {
      wx.showToast({ title: '图片未正确上传，请删除后重新选择', icon: 'none', duration: 2500 });
      return false;
    }
    return true;
  },

  submit() {
    const { publishType } = this.data;
    if (this.data.submitting) return;

    if (!this.isAdmin()) {
      wx.showModal({
        title: '提交审核',
        content: '你的内容将提交给管理员审核，审核通过后才能展示在广场上。确定要提交吗？',
        success: (res) => {
          if (res.confirm) {
            this.doPublish(publishType);
          }
        }
      });
      return;
    }

    this.doPublish(publishType);
  },

  doPublish(publishType) {
    if (publishType === 'confession') return this.submitConfession();
    if (publishType === 'secondhand') return this.submitSecondhand();
    if (publishType === 'study') return this.submitStudy();
    if (publishType === 'lostfound') return this.submitLostfound();
  },

  submitConfession() {
    const { content, toName, fromName, images, contact } = this.data;
    if (!content.trim()) { wx.showToast({ title: '请输入表白内容', icon: 'none' }); return; }
    if (!contact.trim()) { wx.showToast({ title: '请填写联系方式', icon: 'none' }); return; }
    if (!this.checkImages(images)) return;
    const post = {
      type: 'confession',
      title: content.substring(0, 30),
      content: content.trim(),
      toName: toName.trim(),
      fromName: fromName.trim(),
      images,
      publisher: this.getPublisher(contact)
    };
    this.doSubmit('campusWall', 'add', { post });
  },

  submitSecondhand() {
    const d = this.data;
    if (!d.title.trim()) { wx.showToast({ title: '请输入标题', icon: 'none' }); return; }
    if (!d.contact.trim()) { wx.showToast({ title: '请填写联系方式', icon: 'none' }); return; }
    if (!this.checkImages(d.images)) return;

    const post = {
      type: 'secondhand',
      title: d.title.trim(),
      images: d.images,
      desc: d.desc.trim() || '',
      publisher: this.getPublisher(d.contact)
    };
    this.doSubmit('campusWall', 'add', { post });
  },

  submitStudy() {
    const { title, content, images, contact } = this.data;
    if (!title.trim()) { wx.showToast({ title: '请输入标题', icon: 'none' }); return; }
    if (!content.trim()) { wx.showToast({ title: '请输入经验内容', icon: 'none' }); return; }
    if (!contact.trim()) { wx.showToast({ title: '请填写联系方式', icon: 'none' }); return; }
    if (!this.checkImages(images)) return;
    const post = {
      type: 'study',
      title: title.trim(),
      content: content.trim(),
      images,
      publisher: this.getPublisher(contact)
    };
    this.doSubmit('campusWall', 'add', { post });
  },

  submitLostfound() {
    const { title, lostStatus, itemName, location, lostTime, content, contact, images } = this.data;
    if (!title.trim()) { wx.showToast({ title: '请输入标题', icon: 'none' }); return; }
    if (!contact.trim()) { wx.showToast({ title: '请填写联系方式', icon: 'none' }); return; }
    if (!this.checkImages(images)) return;
    const post = {
      type: 'lostfound',
      title: title.trim(),
      lostStatus,
      itemName: itemName.trim(),
      location: location.trim(),
      lostTime: lostTime.trim(),
      content: (content || '').trim(),
      contact: contact.trim(),
      images,
      publisher: this.getPublisher(contact)
    };
    this.doSubmit('campusWall', 'add', { post });
  },

  getPublisher(contact) {
    const userInfo = app.globalData.userInfo || {};
    return {
      nickname: userInfo.nickName || '校园同学',
      avatar: userInfo.avatarUrl || '/images/default-avatar.png',
      wechat: contact.trim(),
      phone: '',
      phoneRaw: ''
    };
  },

  doSubmit(cloudFunc, action, data) {
    const that = this;
    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中...' });

    wx.cloud.callFunction({
      name: cloudFunc,
      data: { ...data, action }
    }).then(res => {
      wx.hideLoading();
      that.setData({ submitting: false });
      const result = res.result || {};
      if (result.code === 0) {
        wx.showToast({ title: result.msg || '发布成功', icon: 'success', duration: 2000 });
        setTimeout(() => {
          that.resetForm();
          wx.switchTab({ url: '/pages/wall/index' });
        }, 2000);
      } else {
        wx.showToast({ title: result.msg || '操作失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      that.setData({ submitting: false });
      console.error(err);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    });
  },

  resetForm() {
    this.setData({
      images: [], cloudImageIds: [], contact: '',
      toName: '', fromName: '', content: '',
      title: '', desc: '',
      lostStatus: 'lost', itemName: '', location: '', lostTime: '',
      submitting: false
    });
  }
});
