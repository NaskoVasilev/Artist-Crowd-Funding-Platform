import express from 'express'
import { createServer, Server } from 'http'
import cors from 'cors'
import { registerApiRoutes } from './api/routes/api-router'
import APIErrorHandler from './api/middleware/global-error-handler'
import { getLoggerFor } from './services/logger'
import { ApplicationSeeder } from './data/seeders/application-seeder'
import { utils } from './utils'
import lusca from 'lusca'
import mongoose from 'mongoose'
import path from 'path'
import fs from 'fs'

export class APIServer {

    public static readonly PORT: number = 80
    private app: express.Application
    private server: Server
    private port: string | number
    private logger = getLoggerFor(this.constructor.name)

    public constructor () {
        this.createApp()
        this.configureDatabase()
        this.initializeDatabase()
        this.config()
        this.createServer()

        this.registerRoutes()
        this.errorHandling()
        this.listen()
    }

    private createApp (): void {
        this.app = express()
    }

    private configureDatabase () {
        mongoose.set('toJSON', {
            virtuals: true,
            transform: (doc: any, converted: any) => {
                delete converted._id
                delete converted.__v
            }
        })
    }

    private initializeDatabase () {
        if (process.env.NODE_ENV === 'DEV') {
            mongoose.connect(process.env.MONGODB_URI)
                .then(() => {
                    console.log('DB Connected')
                })
        } else {
            const mongoUri = process.env.MONGODB_URI

            const certPath = path.normalize(path.join(__dirname, './../ca-certificate.srt'))

            fs.writeFile(certPath, process.env.CA_CERT, (err) => {
                if (err) {
                    console.log(err)
                    return
                }
                mongoose.connect(mongoUri, {
                    tls: true,
                    tlsCAFile: certPath,
                    dbName: process.env.MONGODB_URI.split('/').pop()
                })
            })
            const db = mongoose.connection
            db.on('error', () => { console.log('Failed to connect to the DB!') })
            db.once('open', () => { console.log('Successfully opened DB connection!') })
        }
    }

    private config (): void {
        this.port = process.env.PORT
        this.app.use(express.urlencoded({ extended: false }))
        this.app.use(express.json())
        this.app.use(cors())
        this.app.use(lusca.xframe('SAMEORIGIN'))
        this.app.use(lusca.xssProtection(true))
    }

    private createServer (): void {
        this.server = createServer(this.app)
    }

    private registerRoutes (): void {
        registerApiRoutes(this.app)
    }

    private errorHandling (): void {
        const apiErrorHandler = new APIErrorHandler(this.app)
        this.app = apiErrorHandler.handleErrors()
    }

    private listen (): void {
        this.server.listen(this.port, async () => {
            console.log('  App is running at http://localhost:%d in %s mode', this.port, process.env.NODE_ENV)
            console.log('  Press CTRL-C to stop\n')

            this.logger.info(`Service has started  App is running at http://localhost:${this.port} in ${process.env.NODE_ENV} mode`)
            this.seedData()
        })
    }

    public getApp (): express.Application {
        return this.app
    }

    public seedData (): void {
        if (utils.toBoolean(process.env.SEED_DATA)) {
            const applicationSeeder = new ApplicationSeeder()
            applicationSeeder.seed()
                .then(() => console.log(applicationSeeder.getSuccessMessage()))
                .catch(err => console.log(applicationSeeder.getErrorMessage(err)))
        }
    }

}
