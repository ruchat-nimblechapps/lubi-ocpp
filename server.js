const express = require('express');
const http = require('http');
const morgan = require('morgan');
const cors = require('cors');
// const logger = require('./common/config/logger');
// const route = require('./routes/index')

const app = express();

// parse requests of content-type - application/json
app.use(express.json()); /* bodyParser.json() is deprecated */

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); /* bodyParser.urlencoded() is deprecated */

/** Logging */
app.use(morgan('dev'));

// app.use('/',route);

/**Handles the cors-policy error */
app.use(cors());

/** Error handling */
app.use((req, res, next) => {
    const error = new Error('not found');
    return res.status(404).json({
        message: error.message
    });
});

// set port, listen for requests
const PORT = process.env.APP_PORT || 3000;
const { RPCServer, createRPCError } = require('ocpp-rpc');

const server = new RPCServer({
    protocols: ['ocpp1.6'], // server accepts ocpp1.6 subprotocol
    strictMode: true,       // enable strict validation of requests & responses
});

console.log("Server started")
server.auth((accept, reject, handshake) => {
    // accept the incoming client
    accept({
        // anything passed to accept() will be attached as a 'session' property of the client.
        sessionId: 'XYZ123'
    });
});

server.on('client', async (client) => {
    console.log(`${client.session.sessionId} connected!`); // `XYZ123 connected!`

    // create a specific handler for handling BootNotification requests
    client.handle('BootNotification', ({ params }) => {
        console.log(`Server got BootNotification from ${client.identity}:`, params);

        // respond to accept the client
        return {
            status: "Accepted",
            interval: 300,
            currentTime: new Date().toISOString()
        };
    });

    // create a specific handler for handling Heartbeat requests
    client.handle('Heartbeat', ({ params }) => {
        console.log(`Server got Heartbeat from ${client.identity}:`, params);

        // respond with the server's current time.
        return {
            currentTime: new Date().toISOString()
        };
    });

    // create a specific handler for handling StatusNotification requests
    client.handle('StatusNotification', ({ params }) => {
        console.log(`Server got StatusNotification from ${client.identity}:`, params);
        return {};
    });

    // create a wildcard handler to handle any RPC method
    client.handle(({ method, params }) => {
        // This handler will be called if the incoming method cannot be handled elsewhere.
        console.log(`Server got ${method} from ${client.identity}:`, params);

        // throw an RPC error to inform the server that we don't understand the request.
        throw createRPCError("NotImplemented");
    });
});

server.listen(PORT);
/** End the running process in Node JS  */
const exitHandler = () => {
    if (server) {
        server.close(() => {
            // logger.info('Server closed');
            console.log('Server closed')

            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

/** Handles the occurance of unexpected errors */
const unexpectedErrorHandler = (error) => {
    // logger.error(error);
    console.log(error)
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
    console.log(' received')
    // logger.info(' received');
    if (server) {
        server.close();
    }
});


