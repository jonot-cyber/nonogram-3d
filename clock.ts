const clock = document.querySelector<SVGElement>("#clock");
const clockCircle = document.querySelector<SVGCircleElement>("#clock-circle");
const clockAnimation = document.querySelector<SVGAnimateElement>("#clock-animation");

export function enableClock(seconds: number, callback: () => void) {
    setTimeout(callback, seconds * 1000);
    clockAnimation?.setAttribute("dur", seconds.toString() + "s");
    clockAnimation?.beginElement();
}