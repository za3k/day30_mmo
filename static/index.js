'use strict';

function debug(e) { $(".error").text(e || ""); }

const fast = false; // Skip waits for development?
const randomAdventure = true; // Non-random for develpment

const random = {
    int: function(min, max) { return Math.floor(Math.random()*(max-min+1))+min; },
    choice: function(...things) { return things[random.int(0, things.length-1)]; }
};
function uppercase(x) { return x[0].toUpperCase() + x.slice(1) }
function sleep(seconds) {
    if (fast) return null;
    return new Promise(resolve => {
        setTimeout(resolve, seconds*1000);
    });
}
function scroll() {
    window.scrollTo(0, document.body.scrollHeight);
}

class Easel {
    constructor(div) {
        this.div = div;
        this.jcanvas = div.find("canvas");
        this.canvas = this.jcanvas[0];
        this.done = div.find(".done");
        this.clearBtn = div.find(".clear");
        this.thing = div.find(".thing");
        this.enabled = false;
        this.canvas.height = this.jcanvas.width();
        this.canvas.width = this.jcanvas.height();
        this.clearBtn.on("click", this.clear.bind(this));
    }
    mouse(ev) {
        const rect = this.canvas.getBoundingClientRect()
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
    }
    line(mouse1, mouse2) {
        // assumes mouse (pixel) and canvas coordinates are the same, which they are here.
        const c = this.canvas.getContext("2d");
        c.beginPath();
        c.lineWidth = 5;
        c.moveTo(mouse1.x, mouse1.y);
        c.lineTo(mouse2.x, mouse2.y);
        c.stroke();
    }
    clear() {
        const c = this.canvas.getContext("2d");
        c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    enable() {
        this.div.toggleClass("enabled", true);
        scroll();
        // Allow drawing
        this.jcanvas.on("mousedown", (ev) => {
            let mouse = this.mouse(ev);
            this.line(mouse,mouse);
            this.jcanvas.on("mousemove", (ev) => {
                const newMouse = this.mouse(ev);
                this.line(mouse, newMouse);
                mouse = newMouse;
            })
            $(document).on("mouseup", (ev) => {
                this.jcanvas.off("mousemove");
                $(document).off("mouseup");
                const finalMouse = this.mouse(ev);
                this.line(mouse, finalMouse);
            });
        });
    }
    disable() {
        this.div.toggleClass("enabled", false);
        this.jcanvas.off("mousedown");
        $(document).off("mouseup");
        this.jcanvas.off("mousemove");
    }
    draw(thing) {
        return new Promise((done) => {
            this.thing.text(thing);
            this.clear();
            this.enable();
            
            this.done.on("click", () => {
                this.done.off("click");
                this.disable();
                const data = this.canvas.toDataURL();
                done(data);
            });
        });
    }

}

class Game {
    //getDescriptionFor(thing) {}
    constructor(div, easel, shared) {
        this.div = div;
        this.easel = easel;
        this.link = div.find(".link")
        this.seen = {}
        this.ci = 0;
        this.id = new URLSearchParams(window.location.search).get("shared"); // Load async
        this.shared = {};
        if (this.id) {
            this.ready = this.ajax("/ajax/get", {key:this.id}).then(j => this.shared = j.value)
        } else this.ready = null;

        const game = this;
        this.drawings = new Proxy({}, {
            deleteProperty(target, thing) {
                if(!!localStorage.getItem(this.slot(thing))) {
                    localStorage.clearItem(this.slot(thing));
                    return true;
                }
            },
            get(target, thing) {
                //if (thing in target) return target[thing]; // For stuff like this.drawings.length
                return game.shared[thing] || localStorage.getItem(this.slot(thing));
            },
            set(target, thing, drawing) {
                game.shared[thing] = drawing;
                localStorage.setItem(this.slot(thing), drawing);
                return true;
            },
            slot(thing) {
                return `art-game debug-mode ${thing}`;
            }
        });
    }
    async ajax(url, data) {
        return new Promise(success => {
            $.ajax({
                url: `${window.ajaxPrefix}${url}`,
                method: "POST",
                data: JSON.stringify(data),
                dataType: 'json',
                contentType: 'application/json',
                success: success,
            });
        })
    }
    
    choice(...args) {
        this.ci++;
        if (!!this.shared[this.ci]) return this.shared[this.ci];
        return this.shared[this.ci] = randomAdventure ? random.choice(...args) : args[0];
    }
    makeImage(data) {
        return new Promise(resolve => {
            const img = new Image();
            img.src = data;
            img.onload = () => {
                resolve(img);
            };
        });
    }
    async text(words) {
        // Make a text card
        const narration = $(`<span class="text"><div class="cover"></div>${words}</span>`);
        // Narrate aloud?

        await this.add(narration, 4);
    }
    async add(e, wait) {
        this.easel.div.before(e); 
        scroll();
        if (wait == 0) return;
        await sleep(wait)
    }
    async picture(thing) {
        const nowait = !!this.seen[thing];
        this.seen[thing] = 1;
        let url;
        if (this.drawings[thing]) url = this.shared[thing] = this.drawings[thing];
        else if (this.shared[thing]) url = this.shared[thing];
        else this.drawings[thing] = url = this.shared[thing] = await this.easel.draw(thing);
        const image = await this.makeImage(url);

        // Make a picture card
        const picture = $(`<div class="picture"><div class="picture-label">${thing}</div></div>`);
        const canvas = $('<canvas class="picture-image"></canvas>');
        const context = canvas[0].getContext("2d");
        canvas[0].width = canvas[0].height = 200;
        context.drawImage(image, 0, 0, canvas[0].width, canvas[0].height)
        picture.prepend(canvas);

        await this.add(picture, !!nowait ? 0 : 2)
    }
    async makeLink() {
        const url = new URL(window.location.href);
        if (!this.id) this.id = (await this.ajax("/ajax/store", {value:this.shared})).key
        url.searchParams.set("shared", this.id);
        return url;
    }
    async run() {
        await this.ready;
        const text = (t) => this.text(t);
        const picture = (p) => this.picture(p);
        const choice = (...args) => this.choice(...args);

        const captive = choice("the prince", "the princess", "your cat", "a cool bug")
         , companion = choice("your loyal steed", "your dog", "your unicorn", "your trusty companion", "your magic hat", "your secret crush", "your battle-clown")
         , villain = choice("a dastardly villain", "an evil wizard", "a weird bug", "an evil witch")
         , travel_method = choice("a long rope", "treacherous stairs", "a catapult", "a secret entrance", "a flying carpet")
         , punishment = choice("had to make everyone pie", "went to jail", "was banished", "got boo-ed offstage", "stubbed their toe")
         , guards = choice("a guard", "two guards", "three guards", "a video camera", "a sternly worded 'No Entry' sign")
        const Captive = uppercase(captive), Companion = uppercase(companion);

        await text("Once upon a time, there was a hero. It was you!")
        await text("You arrived at the lonely castle.")
        await picture("a lonely castle")
        await text(`In the distance, a wolf howled. ${Companion} was unsettled.`)
        await picture(`${companion}`)
        await text(`You wanted to enter the castle. But at the front gate, you saw ${guards}.`)
        await text(`You snuck by, while ${companion} created a distraction.`)
         await picture(`${companion}`)
        await picture(`${companion}'s distraction`)
        await text(`You heard a call for help. ${Captive} was at the top of the tallest tower! You had to rescue them! You looked around for a way to get to the top of the tower.`)
        await picture(`climbing the tower with ${travel_method}`)
        await text(`At the top of the tower, you saw ${villain} holding ${captive} captive.`)
        await picture(`${villain}`)
        await picture(`${captive}`)
        await text(`You set your feet, and prepared to defeat ${villain}.`)
         await picture(`${villain}`)
        await picture(`how your plan to defeat ${villain} went wrong`)
        await picture(`how you actually defeated ${villain}`)
        await text(`${Captive} was happy to see you, and gave you a reward.`)
         await picture(`${captive}`)
        await picture("your reward")
        await text(`Everyone lived happily ever after, except ${villain}, who ${punishment}.`)
        await text(`THE END`)

        this.link.show();
        const url = await this.makeLink();
        window.location.searchParam = url.searchParam;
        this.link.attr("href", url.toString());
    }
}

function main() {
    let easel = new Easel($(".easel"));
    let game = new Game($(".game"), easel);
    game.run();
}

(function() {
    function docReady(fn) { // https://stackoverflow.com/questions/9899372/vanilla-javascript-equivalent-of-jquerys-ready-how-to-call-a-function-whe. Avoiding jquery because it's messing up error display
        if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(fn, 1);
        else document.addEventListener("DOMContentLoaded", fn);
    }
    docReady(main);
})();
