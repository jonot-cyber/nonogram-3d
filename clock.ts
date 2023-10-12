const clockAnimation = document.querySelector<SVGAnimateElement>("#clock-animation");

let clockEnabled = false;

export function enableClock(seconds: number, callback: () => void) {
    clockEnabled = true;
    setTimeout(function () {
        if (clockEnabled) {
            callback();
        }
    }, seconds * 1000);
    clockAnimation?.setAttribute("dur", seconds.toString() + "s");
    clockAnimation?.beginElement();
}

export function disableClock() {
    clockEnabled = false;
    clockAnimation?.endElement();
}