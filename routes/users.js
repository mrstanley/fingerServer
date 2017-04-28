var express = require('express');
var request = require('superagent');
var router = express.Router();
var crypto = require('crypto');
var settings = require('../conf/settings')
var WilddogTokenGenerator = require("wilddog-token-generator");
var tokenGenerator = new WilddogTokenGenerator(settings.WilddogSecret);

var Users = global.dbHandel.getModel('users');
/* GET users listing. */
router.post('/login', function (req, res, next) {
	var md5 = crypto.createHash('md5');
	var phone = req.body.phone,
		password = md5.update(req.body.password).digest('hex');
	Users.findOne({
		phone: phone
	}, function (err, doc) {
		if (err) {
			res.json({ code: 500, msg: '网络异常错误' });
		} else if (doc) {
			if (doc.password == password) {
				//用户信息存入 session
				var token = tokenGenerator.createToken({ uid: doc._id.toString() }, { admin: false });
				res.json({ code: 200, msg: '登录成功', token: token });
			} else {
				res.json({ code: 500, msg: '密码错误' });
			}
		} else {
			res.json({ code: 500, msg: '用户不存在，请注册用户' });
		}
	});
});

router.post('/reg', function (req, res, next) {
	var md5 = crypto.createHash('md5');
	var phone = req.body.phone,
		password = md5.update(req.body.password).digest('hex'),
		inviteCode = req.body.inviteCode,
		verifyCode = req.body.verifyCode;
	Users.findOne({
		phone: phone
	}, function (err, doc) {
		if (err) {
			res.json({ code: 500, msg: '网络异常错误' });
		} else if (doc) {
			res.json({ code: 500, msg: '手机号已经存在' });
		} else {
			Users.create({ // 创建一组user对象置入model
				phone: phone,
				password: password
			}, function (err, doc) {
				if (err) {
					res.json({ code: 500, msg: '注册用户时发生错误' });
				} else {
					//	req.session.user = doc;//用户信息存入 session
					var token = tokenGenerator.createToken({ uid: doc._id.toString() }, { admin: false });
					request.put(settings.restRoot + 'users/' + doc._id + '.json?auth=' + settings.WilddogSecret)
						.send({ phone: doc.phone, uid: doc._id })
						.end(function (err, resp) {
							if (err || !resp.ok) {
								res.json({ code: 500, msg: '同步用户数据错误' });
							} else {
								console.log('yay got ' + JSON.stringify(resp.body));
								res.json({ code: 200, msg: '注册成功', token: token });
							}
						})

				}
			});
		}
	});
});

module.exports = router;