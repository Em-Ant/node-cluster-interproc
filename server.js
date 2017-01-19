const cluster = require('cluster')

if(cluster.isMaster) {
  const fs = require('fs')
  const procNumber = require('os').cpus().length
  const net = require('net');

  // basic echo server. It also appends a signature string.
  const server = net.createServer(s => {
    s.on('data', data => {
      s.write( data.toString() + ' <-- [from server]')
    })
  })

  // remove the old socket files or they will block the app.
  fs.unlinkSync(__dirname + '/tmp.sock');

  // the server in the master process is listening to a UNIX socket
  server.listen(__dirname + '/tmp.sock', () => {
    console.log('starting master', process.pid);
    for (let i = 0; i < procNumber-1; i++)
      cluster.fork();
  });
} else {
  // start an worker process running an express app
  startWorker(process.pid);
}


// helper functions
function startWorker(id) {

  console.log('starting worker', id);
  var express = require('express');
  var app = express();
  const net = require('net');

  app.get("/", function (req, res) {
    res.type('txt').send('cluster and interprocess communication test \n\
hit the "\\test" endpoint')
  });

  app.get('/test', function(req, res){
    writeToSocket(net, id, (data) => {
      res.type('txt').send(data);
    });
  })

  // listen for requests :)
  var listener = app.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
  });
}

function writeToSocket(net, pid, cb) {

    const client = net.connect({path: __dirname + '/tmp.sock'}, () => {
    //'connect' listener
    console.log(`${pid} connected`);
    client.write(`hello from pid ${pid}`);
  });
  client.on('data', (data) => {
    cb(data.toString());
    client.end();
  });
  client.on('end', () => {
    console.log(`${pid} disconnected`);
  });
}
