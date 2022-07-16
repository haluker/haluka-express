
const RouterDispatcher = require('@haluka/routing').RouterDispatcher

const express = require('express')
const createError = require("http-errors");

function wrap (action, timeout) {
	return async (req, res, next) => {
		try {
			await action({ req, res, Request: req, Response: res, next })
			if (timeout) {
				setTimeout(() => {
					if (!res.writableEnded) res.end(`Request Timed Out.`)
				}, timeout)
			}
		}catch (error) {
			next(error)
		}
	}
}

exports.default = class ExpressDispatcher extends RouterDispatcher {

	_namedMiddlewares = []
	_express = null
	appdata = {}
	timeout = undefined

	create (appdata, timeout) {
		this._express = express()
		this.appdata = appdata
		this.timeout = timeout

		for (let nmw in appdata.namedMiddlewares) {
			this._namedMiddlewares[nmw] = this.middleware(appdata.namedMiddlewares[nmw])
		}

		for (let mw of appdata.globalMiddlewares)
			this._express.use(this.middleware(mw))

		return this._express
	}

	dispatch () {
		// to be run on every request
		this._express.use(wrap(this.onRequest, this.timeout))

		for (let route of this.load()) {
			let middlewares = route.middlewares.map(x => this.middleware(x))
			route.methods.forEach(method => {
				this._express[method.toLowerCase()](route.uri, ...middlewares,
				wrap(async (ctx) => { await route.compiledAction(ctx); await this.onResponse(ctx); }, this.timeout))
			})
		}
		// 404
		this._express.use((req, res, next) => {
			next(createError(404))
        })
        this._express.use(async (err, req, res, next) => {
			err.status = err.status || 500
            this.errorHandler(err, req, res, next)
        })
	}
	onRequest ({req, res, next}) {
		next()
	}

    onResponse ({req, res}){
		//
	}

    errorHandler (err, req, res, next) {
		next(err)
	}

	middleware (mware) {
		if (Array.isArray(mware)) {
			return mware.map(mw => this.middleware(mw)).flat(Number.MAX_SAFE_INTEGER)
		}else if (this._namedMiddlewares[mware]) {
			return this._namedMiddlewares[mware]
		}else if (typeof(mware) == 'string') {
			throw `No any named middleware registered with name '${mware}'`
		} else {
			return wrap(mware, this.timeout)
		}
	}
}