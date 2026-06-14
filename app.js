import updateManager from './common/updateManager';

// 初始化云开发
wx.cloud.init({
  env: 'your-env-id',
  traceUser: true
});

const db = wx.cloud.database();
const _ = db.command;

App({
  globalData: {
    userInfo: null,
    openid: '',
    role: '',
    isLoggedIn: false,
    db: db,
    _: _
  },

  onLaunch: function () {
    const cachedUser = wx.getStorageSync('userInfo');
    const cachedRole = wx.getStorageSync('role');
    if (cachedUser && cachedRole) {
      this.globalData.userInfo = cachedUser;
      this.globalData.role = cachedRole;
      this.globalData.isLoggedIn = true;
    }
    this.refreshLogin();
  },

  onShow: function () {
    updateManager();
  },

  refreshLogin: function () {
    const that = this;
    wx.cloud.callFunction({
      name: 'getUserRole',
      data: {}
    }).then(res => {
      const result = res.result || {};
      that.globalData.openid = result.openid || '';
      that.globalData.role = result.role || 'user';
      that.globalData.isLoggedIn = true;
      wx.setStorageSync('role', result.role || 'user');
    }).catch(err => {
      console.error('云函数调用失败:', err);
      that.globalData.role = 'user';
      that.globalData.isLoggedIn = true;
    });
  },

  syncUserToCloud: function (userInfo) {
    if (!this.globalData.openid) return;
    const that = this;
    db.collection('users').where({
      _openid: that.globalData.openid
    }).get().then(res => {
      if (res.data.length > 0) {
        db.collection('users').doc(res.data[0]._id).update({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl
          }
        });
      }
    }).catch(err => {
      console.error('syncUserToCloud 失败:', err);
    });
  },

  isAdmin: function () {
    return this.globalData.role === 'admin';
  },

  // 校验并清洗图片路径，过滤掉本地绝对路径等非法路径
  sanitizeImageUrl: function (url) {
    if (!url || typeof url !== 'string') return '';
    // 本地临时路径（仅本设备/本会话有效）直接过滤掉
    if (url.indexOf('http://tmp') === 0 || url.indexOf('wxfile://') === 0 || url.indexOf('wxlocal://') === 0) {
      return '';
    }
    var validPrefixes = ['cloud://', 'http://', 'https://', '/'];
    var isValid = validPrefixes.some(function (p) { return url.indexOf(p) === 0; });
    return isValid ? url : '';
  },

  // 将 cloud:// 文件 ID 批量转为临时 HTTPS 链接（客户端兜底）
  resolveCloudImages: function (items, fields) {
    if (!items || items.length === 0) return Promise.resolve(items);
    var that = this;
    var cloudIds = [];
    var mappings = [];
    items.forEach(function (item, i) {
      fields.forEach(function (field) {
        var val = item[field];
        if (Array.isArray(val)) {
          val.forEach(function (v, j) {
            if (typeof v === 'string' && v.indexOf('cloud://') === 0) {
              cloudIds.push(v);
              mappings.push({ item: item, field: field, idx: j });
            }
          });
        } else if (typeof val === 'string' && val.indexOf('cloud://') === 0) {
          cloudIds.push(val);
          mappings.push({ item: item, field: field, idx: -1 });
        }
      });
    });
    if (cloudIds.length === 0) return Promise.resolve(items);
    return wx.cloud.getTempFileURL({ fileList: cloudIds }).then(function (res) {
      var urlMap = {};
      (res.fileList || []).forEach(function (f) {
        if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
      });
      mappings.forEach(function (m) {
        if (m.idx >= 0) {
          if (urlMap[m.item[m.field][m.idx]]) {
            m.item[m.field][m.idx] = urlMap[m.item[m.field][m.idx]];
          }
        } else {
          if (urlMap[m.item[m.field]]) {
            m.item[m.field] = urlMap[m.item[m.field]];
          }
        }
      });
      return items;
    }).catch(function (err) {
      console.error('resolveCloudImages failed:', err);
      return items;
    });
  },

  // 清洗商品/帖子对象中的图片字段
  sanitizeProductImages: function (obj) {
    if (!obj) return obj;
    if (obj.coverImage) {
      obj.coverImage = this.sanitizeImageUrl(obj.coverImage);
    }
    if (obj.images && Array.isArray(obj.images)) {
      obj.images = obj.images
        .map(function (img) { return this.sanitizeImageUrl(img); }.bind(this))
        .filter(Boolean);
    }
    if (obj.publisher && obj.publisher.avatar) {
      obj.publisher.avatar = this.sanitizeImageUrl(obj.publisher.avatar) || '/images/default-avatar.png';
    }
    return obj;
  }
});
