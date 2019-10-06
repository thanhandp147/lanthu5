const express = require('express');
const router = express.Router();

const { hash, compare } = require('bcrypt');
const { USER_MODEL } = require('../models/user.model');
const { POST_MODEL } = require('../models/post.model')
const validateRegisterInput = require('../validation/register.validate');
const bcrypt = require('bcrypt');


router.route('/register')
    .get((req, res) => {
        res.render('demodangki')
    })
    .post(async (req, res) => {
        //Check validation
        const { errors, isValid } = validateRegisterInput(req.body);

        const { username, password, fullname, email } = req.body;
        await USER_MODEL.findOne({ username }).then(user => {
            if (user) {
                console.log(user);
                errors.unshift("Username is Exist")
            }
        })
        if (!isValid) {

             res.send(errors);

        }
        if (isValid) {
            
            res.send(errors)
            const newUser = new USER_MODEL({
                username,
                email,
                fullname,
                password
            })
            // Hash password before saving in database
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, async (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    await newUser
                    .save()
                    .then(()=> console.log('Done'))
                    .catch(err => console.log(err));
                })
            })
        }
        
    })
        

router.route('/login')
    .post(async (req, res) => {
        const { usernameLogin: username, passwordLogin: password } = req.body;
        console.log(username, password);
        
        let isExistUser = await USER_MODEL.findOne({ username });
        if (!isExistUser) return res.send('Sai tên đăng nhập');
        const { password: hashPwd } = isExistUser;
        let isMatch = await compare(password, hashPwd);
        if (!isMatch) return res.send('Sai mật khẩu, vui lòng nhập lại');
        req.session.infoUser = isExistUser;
        res.send({redirect: '/'});
    })

router.get('/', async (req, res) => {
    const { infoUser } = req.session;
    // if (!infoUser) res.render('error', { message: 'Vui long dang nhap' });
    if (!infoUser) return res.redirect('/register')
    const { username: usernameCurrent, fullname, email, _id: senderID } = infoUser;
    let inforUserDB = await USER_MODEL.findOne({
        username: usernameCurrent
    })
        .populate('guestsRequest')
        .populate('friends');
    const { usersRequest, guestsRequest, friends } = inforUserDB;
    let listUsers = await USER_MODEL.find({
        username: {
            $ne: usernameCurrent
        },
        friends: {
            $ne: senderID
        },
        usersRequest: {
            $ne: senderID
        }
    })
    let listInfoPostDB = await POST_MODEL.find({
        author: senderID
    })
        .populate('author')
    console.log(`LIST infoPOST DB: ${listInfoPostDB}`);

    // console.log(`LOG ${listUsers}`);
    res.render('home', { fullname, email, listUsers, usersRequest, guestsRequest, friends, listInfoPostDB })
})
router.get('/request-add-friend/:recieverID', async (req, res) => {
    const { recieverID } = req.params;
    const { infoUser } = req.session;
    if (!infoUser) res.render('error', { message: `Vui long dang nhap` });
    const { fullname, email, username: usernameCurrent, _id: senderID } = infoUser;

    let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
        $addToSet: {
            usersRequest: recieverID
        }
    }, { new: true });

    let infoUserReceiverAfterUpdated = await USER_MODEL.findByIdAndUpdate(recieverID, {
        $addToSet: {
            guestsRequest: senderID
        }
    }, { new: true });

    res.redirect('/user');
})
router.get('/request-remove-friend/:recieverID', async (req, res) => {
    const { recieverID } = req.params;
    const { infoUser } = req.session;
    if (!infoUser) res.render('error', { message: `Vui long dang nhap` });
    const { fullname, email, username: usernameCurrent, _id: senderID } = infoUser;

    let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
        $pull: {
            usersRequest: recieverID
        }
    }, { new: true });

    let infoUserReceiverAfterUpdated = await USER_MODEL.findByIdAndUpdate(recieverID, {
        $pull: {
            guestsRequest: senderID
        }
    }, { new: true });
    res.redirect('/user');
})

router.get('/resolve-friend/:recieverID', async (req, res) => {
    const { recieverID } = req.params;
    const { infoUser } = req.session;
    if (!infoUser) res.render('error', { message: `Vui long dang nhap` });
    const { fullname, email, username: usernameCurrent, _id: senderID } = infoUser;

    let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
        $addToSet: {
            friends: recieverID
        },
        $pull: {
            guestsRequest: recieverID
        }
    }, { new: true });

    let infoUserReceiverAfterUpdated = await USER_MODEL.findByIdAndUpdate(recieverID, {
        $addToSet: {
            friends: senderID
        },
        $pull: {
            usersRequest: senderID
        }
    }, { new: true });
    // console.log(`LOG: ${infoUserSenderAfterUpdated}`);

    res.redirect('/user');
})

router.get('/reject-friend/:recieverID', async (req, res) => {
    const { recieverID } = req.params;
    const { infoUser } = req.session;
    if (!infoUser) res.render('error', { message: 'đăng nhập di' });
    const { fullname, email, username: usernameCurrentLogin, _id: senderID } = infoUser;

    let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
        $pull: {
            guestsRequest: recieverID
        }
    }, { new: true });

    let infoUserReceiverAfterUpdate = await USER_MODEL.findByIdAndUpdate(recieverID, {
        $pull: {
            usersRequest: senderID
        }
    }, { new: true });

    res.redirect('/user');
});

router.get('/un-friend/:friendID', async (req, res) => {
    const { friendID } = req.params;
    const { infoUser } = req.session;
    if (!infoUser) res.render('error', { message: `Vui long dang nhap` });
    const { fullname, email, username: usernameCurrent, _id: senderID } = infoUser;

    let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
        $pull: {
            friends: friendID
        }
    }, { new: true });

    let infoUserReceiverAfterUpdated = await USER_MODEL.findByIdAndUpdate(friendID, {
        $pull: {
            friends: senderID
        }
    }, { new: true });
    res.redirect('/user')
})

// router.get('/demo', ( req, res) => {
//     res.render('demo-ajax');
// })


exports.USER_ROUTER = router;