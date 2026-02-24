let targetTime = null;
let checkInterval = null;

self.onmessage = function (e) {
  const { type, target } = e.data;

  if (type === "start") {
    targetTime = target;
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
      if (Date.now() >= targetTime) {
        self.postMessage({ type: "complete" });
        clearInterval(checkInterval);
        checkInterval = null;
        targetTime = null;
      }
    }, 1000);
  }

  if (type === "stop") {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = null;
    targetTime = null;
  }
};
