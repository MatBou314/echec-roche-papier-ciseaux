import { botList } from "./bot";

self.onmessage = function(event) {
    const { botId, board, maxTime, requestId} = event.data;
    const botFunction = botList[botID];
    if (!botFunction) {
      self.postMessage({ error: `Bot '${botId}' not found`, requestId });
      return;
    }
    const move = botFunction(board, maxTime);
    self.postMessage({move, requestId});
}