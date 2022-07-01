
const Router = require('@haluka/routing').Router
const ExpressDispatcher = require('../').default

const request = require('supertest')

const appdata = { 
    namedMiddlewares : {
        mid1: [({req, res, next}) => { req.lol = 'yeah'; next() }, ({req, res, next}) => { next() }],
        mid2: ({req, res, next}) => { req.dont = "next" }
    }, 
    globalMiddlewares: ['mid1']
}
let r = new Router()
let dispatcher = new ExpressDispatcher(r)
let http = dispatcher.create(appdata, 1000)
r.get('/', ({req, res}) => res.send('Response is ' + req.lol))
r.get('/a', ({req, res}) => res.send(req.dont)).middleware('mid2')
r.get('/wrong', ({req, res}) => res.send(dont()))
dispatcher.dispatch(http, 1000)

test('dispatch routes', (done) => {
    request(http)
        .get('/')
        .expect('Content-type', /html/)
        .expect('content-length', '16')
        .expect(200)
        .end(done)
})

test('not found', (done) => {
    request(http)
        .get('/notfound')
        .expect(404)
        .end(done)
})

test('middleware', (done) => {
    request(http)
        .get('/a')
        .expect('content-length', 'Request Timed Out.'.length.toString())
        .expect(200)
        .end(done)
})

test ('throw on non existent middleware', () => {
    r.flush()
    expect(() => {
        r.get('/erroring', ({req, res}) => res.send(req.dont)).middleware('nonexistent')
        dispatcher.dispatch(http, 1000)
    }).toThrow(`No any named middleware registered with name 'nonexistent'`)
})

test ('route with errors', (done) => {
    request(http)
        .get('/wrong')
        .expect(500)
        .expect((res) => {
            if (!res.error.text.includes('dont is not defined')) 
                throw new Error('Threw an unexpected error.')
        })
        .end(done)
})