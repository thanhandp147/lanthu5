const express= require('express');
const router= express.Router();

const { USER_MODEL }= require('../models/user.model');
const { POST_MODEL }= require('../models/post.model');

router.post('/message', async( req, res) => {
    const { infoUser }= req.session;
    if(!infoUser) res.render('error', { message: `Vui long dang nhap` });
    const { _id: authorID }= req.session.infoUser;
    const { text }= req.body;
    let newPost= new POST_MODEL({ author: authorID, content: text });
    let infoAfterInserted= await newPost.save();
    res.redirect('/user')
})

exports.POST_ROUTER= router;