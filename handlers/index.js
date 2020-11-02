function handlers(req, res, next) {
    console.log('id: ', req.params);
    if(!req.params.id) {
        console.error('missing id params');
        return res.send({ error: "missing id params "
    });
    }
    console.log('here');
    next();
}

module.exports = handlers;