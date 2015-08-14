var TelegramBotWebHook = require('./telegramWebHook');
var TelegramBotPolling = require('./telegramPolling');
var debug = require('debug')('node-telegram-bot-api');
var EventEmitter = require('events').EventEmitter;
var Promise = require("bluebird");
var request = require("request");
var stream = require('stream');
var util = require('util');
var mime = require('mime');
var path = require('path');
var URL = require('url');
var fs = require('fs');

var requestPromise = Promise.promisify(request);

var TelegramBot = function (token, options) {
  options = options || {};
  this.token = token;

  var processUpdate = this._processUpdate.bind(this);

  if (options.polling) {
    this._polling = new TelegramBotPolling(token, options.polling, processUpdate);
  }

  if (options.webHook) {
    this._WebHook = new TelegramBotWebHook(token, options.webHook, processUpdate);
  }
};

util.inherits(TelegramBot, EventEmitter);

TelegramBot.prototype._processUpdate = function (update) {
  debug('Process Update', update);
  debug('Process Update message', update.message);
  if (update.message) {
    this.emit('message', update.message);
  }
};

TelegramBot.prototype._request = function (path, options) {
  if (!this.token) {
    throw new Error('Telegram Bot Token not provided!');
  }
  options = options || {};
  options.url = URL.format({
    protocol: 'https',
    host: 'api.telegram.org',
    pathname: '/bot' + this.token + '/' + path
  });
  debug('HTTP request: %j', options);
  return requestPromise(options).then(function (resp) {
    if (resp[0].statusCode !== 200) {
      throw new Error(resp[0].statusCode + ' ' + resp[0].body);
    }
    var data = JSON.parse(resp[0].body);
    if (data.ok) {
      return data.result;
    } else {
      throw new Error(data.error_code + ' ' + data.description);
    }
  });
};

TelegramBot.prototype.getMe = function () {
  var path = 'getMe';
  return this._request(path);
};

TelegramBot.prototype.setWebHook = function (url) {
  var path = 'setWebHook';
  var qs = {url: url};
  return this._request(path, {qs: qs})
    .then(function (resp) {
      if (!resp) {
        throw new Error(resp);
      }
      return resp;
    });
};

TelegramBot.prototype.getUpdates = function (timeout, limit, offset) {
  var query = {
    offset: offset,
    limit: limit,
    timeout: timeout
  };

  return this._request('getUpdates', {qs: query});
};

TelegramBot.prototype.sendMessage = function (chatId, text, options) {
  var query = options || {};
  query.chat_id = chatId;
  query.text = text;
  return this._request('sendMessage', {qs: query});
};

TelegramBot.prototype.forwardMessage = function (chatId, fromChatId, messageId) {
  var query = {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId
  };
  return this._request('forwardMessage', {qs: query});
};

TelegramBot.prototype._formatSendData = function (type, data) {
  var formData;
  var fileName;
  var fileId;
  if (data instanceof stream.Stream) {
    fileName = URL.parse(path.basename(data.path)).pathname;
    formData = {};
    formData[type] = {
      value: data,
      options: {
        filename: fileName,
        contentType: mime.lookup(fileName)
      }
    };
  } else if (fs.existsSync(data)) {
    fileName = path.basename(data);
    formData = {};
    formData[type] = {
      value: fs.createReadStream(data),
      options: {
        filename: fileName,
        contentType: mime.lookup(fileName)
      }
    };
  } else {
    fileId = data;
  }
  return [formData, fileId];
};

TelegramBot.prototype.sendPhoto = function (chatId, photo, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('photo', photo);
  opts.formData = content[0];
  opts.qs.photo = content[1];
  return this._request('sendPhoto', opts);
};

TelegramBot.prototype.sendAudio = function (chatId, audio, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('audio', audio);
  opts.formData = content[0];
  opts.qs.audio = content[1];
  return this._request('sendAudio', opts);
};

TelegramBot.prototype.sendDocument = function (chatId, doc, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('document', doc);
  opts.formData = content[0];
  opts.qs.document = content[1];
  return this._request('sendDocument', opts);
};

TelegramBot.prototype.sendSticker = function (chatId, sticker, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('sticker', sticker);
  opts.formData = content[0];
  opts.qs.sticker = content[1];
  return this._request('sendSticker', opts);
};

TelegramBot.prototype.sendVideo = function (chatId, video, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('video', video);
  opts.formData = content[0];
  opts.qs.video = content[1];
  return this._request('sendVideo', opts);
};

TelegramBot.prototype.sendChatAction = function (chatId, action) {
  var query = {
    chat_id: chatId,
    action: action
  };
  return this._request('sendChatAction', {qs: query});
};

TelegramBot.prototype.getUserProfilePhotos = function (userId, offset, limit) {
  var query = {
    user_id: userId,
    offset: offset,
    limit: limit
  };
  return this._request('getUserProfilePhotos', {qs: query});
};

TelegramBot.prototype.sendLocation = function (chatId, latitude, longitude, options) {
  var query = options || {};
  query.chat_id = chatId;
  query.latitude = latitude;
  query.longitude = longitude;
  return this._request('sendLocation', {qs: query});
};

module.exports = TelegramBot;
