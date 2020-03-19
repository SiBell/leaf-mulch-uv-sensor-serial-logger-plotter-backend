//-------------------------------------------------
// Dependencies
//-------------------------------------------------
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const WebSocket = require('ws');
const fs = require('fs');
const format = require('date-fns/format');

//-------------------------------------------------
// Create a data file
//-------------------------------------------------

const fileNameAndPath = `./data/${makeDateFilenameFriendly(new Date())}.csv`;
// fs.writeFileSync(fileNameAndPath);
const fileStream = fs.createWriteStream(fileNameAndPath);
fileStream.write('Time ISO8601,Time,Diode 1,Diode 2,Diode 3\n');



//-------------------------------------------------
// Setup serial
//-------------------------------------------------
// On a Mac you can use the following command to list the available serial ports:  ls /dev/{tty,cu}.* 
const serialPortName = '/dev/tty.usbserial-FT9FPG58';
const baudRate = 9600;

const port = new SerialPort(serialPortName, {
  baudRate
}, (err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log('Port opened');
  }
});

const parser = new Readline();
port.pipe(parser);


//-------------------------------------------------
// Setup websockets
//-------------------------------------------------
const wss = new WebSocket.Server({port: 8080});

let websocketConnectionMade = false;
let wsConnection;
 
wss.on('connection', (ws) => {

  console.log('A client has connected to the websocket');
  websocketConnectionMade = true;

  wsConnection = ws;

});



//-------------------------------------------------
// Start Listening
//-------------------------------------------------
// Switches the port into "flowing mode"
parser.on('data', (data) => {

  const dateReceived = new Date();
  const dataStringWithoutNewLineCharacter = data.replace('\r', '');
  const dataAsArray = dataStringWithoutNewLineCharacter.split(',');
  const dataAsNumericalArray = dataAsArray.map((value) => Number(value));

  // Save to file
  const lineForFile = `${dateReceived.toISOString()},${format(dateReceived, 'yyyy-MM-dd HH:mm:ss')},${dataAsNumericalArray.join(',')}\n`;
  fileStream.write(lineForFile);
  console.log(lineForFile);

  // Transmit via websocket
  if (websocketConnectionMade) {
    wsConnection.send(JSON.stringify({
      time: dateReceived.toISOString(),
      data: dataAsNumericalArray
    }));
  }

});





function makeDateFilenameFriendly(date) {
  const inter = `${date.toISOString().split('.')[0]}Z`;
  const fileName = inter.replace(/:/g, '-');
  return fileName;
}


