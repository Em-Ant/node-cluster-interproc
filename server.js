const cluster = require('cluster')

if(cluster.isMaster) {
  const fs = require('fs')
  const procNumber = require('os').cpus().length
  const net = require('net');
  const rpc = require('rpc-stream');

  // basic echo server executing a Remote Procedure Call.
  // It also appends a signature string.
  const server = net.createServer(s => {
    const server = rpc({addTail: function(data, cb){
      cb(null, data + ' <--[from rpc]');
    }})
    server.pipe(s).pipe(server);
  })

  // remove the old socket file or it will block the app.
  if(fs.existsSync(__dirname + '/tmp.sock')) {
    fs.unlinkSync(__dirname + '/tmp.sock');
  }

  // the server in the master process is listening to a UNIX socket
  server.listen(__dirname + '/tmp.sock', () => {
    console.log('starting master', process.pid);
    for (let i = 0; i < procNumber-1; i++)
      cluster.fork();
  });
} else {
  // start a worker process running an express app
  startWorker(process.pid);
}


// worker function
function startWorker(id) {

  console.log('starting worker', id);
  var express = require('express');
  var app = express();
  const net = require('net');

  // connect the child process to execute the RPC
  const rpc = require('rpc-stream');
  client = rpc();
  const remote = client.wrap('addTail');
  const conn = net.connect({path: __dirname + '/tmp.sock'})
  client.pipe(conn).pipe(client);


  app.get("/", function (req, res) {
    res.type('txt').send('cluster and interprocess rpc test \n\
hit the "/test" endpoint')
  });

  app.get('/test', function(req, res){
    // execute the rpc, and send back its response
    remote.addTail(`hello from pid ${id}`, (err, data) => {
      if(err) return res.status(500).send('error');
      res.type('txt').send(data);
    });
  })

  // listen for requests :)
  var listener = app.listen(process.env.PORT || 3000, function () {
    console.log('Your app is listening on port ' + listener.address().port);
  });
}
