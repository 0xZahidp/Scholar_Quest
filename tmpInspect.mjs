import * as proxy from "file:///D:/Projects/scholar-quest-main/.output/public/assets/proxy-huaVpicR.js";
console.log("keys", Object.keys(proxy));
console.log("type m", typeof proxy.m);
console.log("props", Object.getOwnPropertyNames(proxy.m).slice(0,20));
console.log("hasDiv", "div" in proxy.m);
console.log("div", proxy.m.div);
console.log("typeof div", typeof proxy.m.div);
