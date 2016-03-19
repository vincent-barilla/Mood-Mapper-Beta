var WebSocketServer = require('websocket').server;

var http = require('http');
 
var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen((process.env.PORT || 8080), function() {
    console.log((new Date()) + ' Socket server is listening on port 8080');
});
 

var socketServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin){
    return true;
}

socketServer.on('request', function(request){
    if (!originIsAllowed(request.origin)){
        request.reject();
        console.log((new Date()) + 'Connection from origin ' + request.origin + ' rejected.')
        return;
    }

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message){
        if (message.type === 'utf8'){
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }

        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes.');
        }
    });

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + " disconnected.");
    });
});