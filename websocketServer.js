const handleMessage = (ws, message) => {
  // console.log(`Received message: ${message}`);
  const parsedMessage = JSON.parse(message);

  switch (parsedMessage.type) {
    case 'DATA_RESPONSE':
      console.log('Received data:', parsedMessage.data);
      break;
    case 'UPDATE_ACK':
      console.log(
        `Register ${parsedMessage.registerAddress} updated to ${parsedMessage.newValue}`
      );
      break;
    default:
      console.log('Unknown message type:', parsedMessage.type);
  }
};

const sendReadDataRequest = (ws) => {
  // ws.send(JSON.stringify({ type: 'READ_DATA' }));
};

const sendUpdateRegisterRequest = (ws, registerAddress, newValue) => {
  // ws.send(
  //   JSON.stringify({ type: 'UPDATE_REGISTER', registerAddress, newValue })
  // );
};

module.exports = {
  handleMessage,
  sendReadDataRequest,
  sendUpdateRegisterRequest,
};
