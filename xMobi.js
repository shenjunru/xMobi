/*!
 * xMobile - Mobile JavaScript Library
 * version 1.0 beta
 * 
 * Copyright 2010, Shen Junru
 * Released under the MIT License.
 * http://github.com/xfsn/xMobi
 * 
 * Date: 2010-09-12
 */
(function(window, undefined){

var
version  = '1.0 beta',
NULL     = null,
$body    = NULL,
FN       = function(){},
BB       = window.blackberry,
document = window.document,
$head    = document.getElementsByTagName('head')[0],
$docEl   = document.documentElement,
$frag    = document.createElement('div'),
geo      = navigator.geolocation,
geoBB    = (BB || {}).location,
support  = {
    geo:                  !!geo || !!geoBB,
    gesture:              typeof GestureEvent === 'object',
    touch:                typeof TouchEvent === 'object',
    WebKitCSSMatrix:      typeof WebKitCSSMatrix === 'object',
    WebKitAnimationEvent: typeof WebKitTransitionEvent === 'object'
},
browse   = {
    apple: support.touch && /iP(ad|od|hone)/.test(navigator.userAgent),
    blackberry: !!window.blackberry,
    scroll: false
},

/**
 * log error message
 * 
 * @param {Error} e  error object
 */
error = function(e){},

/**
 * GEO error handler
 * 
 * @param {Error} error
 */
geoError = function(error){},

/**
 * get current timestamp
 * 
 * @return {Number} timestamp
 */
timeStamp = function(){
    return (new Date).getTime();
},

/**
 * extend a object
 * 
 * @param {Object} destination
 * @param {Object} source
 * 
 * @return {Object} destination
 */
extend = function(destination, source){
    for (var key in source) {
        destination[key] = source[key];
    }
    return destination;
},

/**
 * call a function
 * 
 * @param {Function} fn        a function
 * @param {Object}   instance  a instance
 */
call = function(fn, instance){
    if (typeof fn === 'function') try {
        return fn.apply(instance || NULL, [].slice.call(arguments, 2));
    } catch (e) {
        error(e);
    }
},
        
/**
 * check device is landscape
 * 
 * @return {Boolean}
 */
isLandscape = ('orientation' in window ? function(){
    return Math.abs(window.orientation) === 90;
} : function(){
    return (window.innerWidth || $docEl.offsetWidth) > (window.innerHeight || $docEl.offsetHeight);
}),
    
/**
 * get current orientation
 * 
 * @return {String} landscape|portrait
 */
getOrientation = function(){
    return isLandscape() ? 'landscape' : 'portrait';
},

/**
 * stop default behaviour and propagation for a event
 * 
 * @param {Event}   event      event object
 * @param {Boolean} immediate  immediately stop
 */
stopEvent = (function(){
    function set(event, key, value){
        this[key] = value;
    }
    return function(event, immediate){
        if (!event.stoped) {
            (event.preventDefault || set).call(event, 'returnValue', false);
            (event.stopPropagation || set).call(event, 'cancelBubble', true);
            event.stoped = true;
            if (event.imStoped = !!immediate) (event.stopImmediatePropagation || FN)();
        }
    };
})(),

/**
 * bind a event handler
 * 
 * @param {Element}  node     dom element
 * @param {String}   event    event type
 * @param {Function} handler  event handler
 * @param {Boolean}  dom0     bind as DOM 0 style
 */
bind = (function(){
    var fnName, exName = false;
    
    ((fnName = 'addEventListener') in document)
    || ((exName = true) && (fnName = 'attachEvent') in document)
    || (fnName = '');
    
    return function(node, event, handler, dom0){
        var special = /^DOM/.test(event);
        if (node && event && handler) {
            if (!special && (dom0 || exName)) event = 'on' + event;
            if (!special && (dom0 || !fnName)) node[event] = handler;
            else fnName && node[fnName](event, handler, false);
        }
    };
})(),

/**
 * unbind a event handler
 * 
 * @param {Element}  node     dom element
 * @param {String}   event    event type
 * @param {Function} handler  event handler
 * @param {Boolean}  dom0     bind as DOM 0 style
 */
unbind = (function(){
    var fnName, exName = false;
    
    ((fnName = 'removeEventListener') in document)
    || ((exName = true) && (fnName = 'detachEvent') in document)
    || (fnName = '');
    
    return function(node, event, handler, dom0){
        var special = /^DOM/.test(event);
        if (node && event && handler) {
            if (!special && (dom0 || exName)) event = 'on' + event;
            if (!special && (dom0 || !fnName)) node[event] = NULL;
            else fnName && node[fnName](event, handler, false);
        }
    };
})(),

/**
 * get a event handlers stack
 * 
 * @param {Element} node  dom element
 * @param {String}  type  event type
 * 
 * @return {Array} event handlers stack
 */
getEventStack = function(node, type){
    var stack = node.stack || $docEl.stack || {};
    return stack[type] || [];
},

/**
 * initialize a event handlers stack
 * 
 * @param {Element} node  dom element
 * @param {String}  type  event type
 * 
 * @return {Array} event handlers stack
 */
initEventStack = function(node, type){
    var stack = node.stack;
    if (!stack) stack = node.stack = {};
    if (type && !stack[type]) stack[type] = [];
    return type ? stack[type] : NULL;
},

/**
 * generate a event register function
 * 
 * @param {Array|String} type  Array: event handlers stack, String: event type
 * @param {Function}     init  run once after register first handler
 * @param {Boolean}      one   only one handler can be registered
 * 
 * @return {Function} event register function
 */
hdlRegister = function(type, init, one){
    return function(node, handler){
        if (type) {
            if (typeof type === 'string') stack = initEventStack(node, type);
            else if (type instanceof Array) stack = type, handler = node;
            if (one) stack.length = 0;
            handler && typeof handler === 'function' && stack.push(handler);
        }
        init && runInit(init, type);
    };
},

/**
 * run a event handlers stack
 * 
 * @param {Array}  stack     the event handlers stack
 * @param {Object} instance  event handler caller
 * @param {Object} rest parameters for event handler
 * 
 */
runStack = function(stack, instance){
    if (stack && stack.length) {
        var i = 0, args = [].slice.call(arguments, 2);
        try {
            while (stack[i]) {
                stack[i++].apply(instance || window, args);
            }
        } catch (e) {
            error(e);
        }
    }
},

/**
 * run a initializing function
 * 
 * @param {Function} init  initializing function
 */
runInit = function(init, params){
    init.$ || ((init.$ = 1) && init.call(window, params));
},

/**
 * touch event initializing function
 */
touchInit = (function(){
    var startEvent, moveEvent, endEvent, touchData, dragable, moved, tapNode;
    
    if (support.touch) {
        startEvent = 'touchstart';
        moveEvent  = 'touchmove';
        endEvent   = 'touchend';
    } else {
        startEvent = 'mousedown';
        moveEvent  = 'mousemove';
        endEvent   = 'mouseup';
    }
    
    function position(touch) {
        return {
            x: touch.pageX || (
                touch.clientX +
                ($docEl.scrollLeft || $body.scrollLeft) -
                ($docEl.clientLeft || 0)
            ),
            y: touch.pageY || (
                touch.clientY +
                ($docEl.scrollTop || $body.scrollTop) -
                ($docEl.clientTop || 0)
            )
        };
    }
    
    function getData(event, touch){
        var pos = position(touch);
        return {
            time: event.timeStamp || timeStamp(),
            node: touch.target || touch.srcElement,
            x: pos.x,
            y: pos.y
        };
    }
    
    function getTouch(event){
        return support.touch ? event.targetTouches[0] || {} : event;
    }
    
    function getTouches(event){
        return support.touch ? event.touches || [] : [event];
    }
    
    function getTouchId(touch){
        return touch.identifier || 0;
    }
    
    function eachTouch(event, each){
        var touch, i = 0, touches = getTouches(event);
        while ((touch = touches[i++])) each(event, touch);
        return touches.length;
    }
    
    function getTauchData(touch){
        return (touchData || {})[getTouchId(touch)];
    }
    
    function getDelta(touch, time, start){
        var pos = position(touch);
        start = start || getTauchData(touch);
        return start ? {
            node: start.node,//touch.target || touch.srcElement,
            dtime: time - start.time,
            dx: pos.x - start.x,
            dy: pos.y - start.y
        } : NULL;
    }
    
    function isMultiTouch(event){
        return getTouches(event).length > 1;
    }
    
    function newPosition(data){
        return {
            x: data.posX + data.dx,
            y: data.posY + data.dy
        };
    }
    
    function move(node, data){
        data = call(getEventStack(node, 'drag')[0] || newPosition, node, data, newPosition);
        if (data) {
            node.style.left = data.x + 'px';
            node.style.top = data.y + 'px';
        }
    }
    
    function release(){
        unbind($docEl, moveEvent, touchMove);
        unbind($docEl, endEvent,  touchEnd);
    }
    
    function touchStart(event){
        event = event || window.event;
        touchData = {}, dragable = moved = false, tapNode = NULL;
        eachTouch(event, function(event, touch){
            var data = touchData[getTouchId(touch)] = getData(event, touch),
            node = tapNode = data.node;
            if (!!node.dragable) {
                node.offsetPos = {
                    x: node.offsetLeft,
                    y: node.offsetTop
                };
                dragable = dragable || node.dragable;
            }
        }) > 1 && (tapNode = NULL);
        dragable && stopEvent(event);
        bind($docEl, moveEvent, touchMove);
        bind($docEl, endEvent,  touchEnd);
    }
    
    function touchMove(event) {
        moved = true, event = event || window.event;
        var data, time = event.timeStamp || timeStamp();
        if (dragable) {
            stopEvent(event);
            eachTouch(event, function(event, touch){
                data = getTauchData(touch);
                var node = data.node,
                offsetPos = node.offsetPos;
                if (node.dragable && offsetPos) {
                    if (data = getDelta(touch, time, data)) {
                        // move element
                        move(node, {
                            posX: offsetPos.x,
                            posY: offsetPos.y,
                            dx:   data.dx,
                            dy:   data.dy
                        });
                    }
                }
            });
        } else if (!isMultiTouch(event)) {
            if (data = getDelta(getTouch(event), time)) {
                var node = data.node,
                absX = Math.abs(data.dx),
                absY = Math.abs(data.dy);
                
                if (absX > absY && (absX > 60) && data.dtime < 1000) {
                    release();
                    runHdls(getEventStack(node, 'swipe'), node, data.dx < 0 ? 'left' : 'right', event);
                }
            }
        }
    }
    
    function touchEnd(event){
        release();
        if (!moved && tapNode) runStack(getEventStack(tapNode, 'tap'), tapNode, event || window.event);
    }
    
    return function(key){
        initEventStack($docEl, key);
        bind($docEl, startEvent, touchStart);
    }
})(),

/**
 * run JavaScript code
 * 
 * @param {String} code   JavaScript code
 * @param {Object} scope  JavaScript code
 */
runScript = function(code, scope){
    code && (new Function(code)).call(scope || window);
},

/**
 * fill data to a template string
 * 
 * @param {String} template  a template string
 * @param {Object} data      data to fill the template string
 * 
 * @return {String} filled template string
 */
fillTemplate = function(template, data){
    data = data || [];
    if (!(data instanceof Array)) data = [data];
    var key, part, result, i = 0, results = [];
    while ((part = data[i++])) {
        result = template;
        for (key in part) {
            result = result.replace(new RegExp('#' + key + '#', 'g'), function(){
                return part[key];
            });
        }
        results.push(result);
    }
    return results.join('');
},

/**
 * parse html code to dom elements
 * 
 * @param {String} template  template string
 * @param {Object} data      data to fill the template string
 * 
 * @return {DocumentFragment}  a DocumentFragment includes result elements
 */
parseHTML = function(template, data){
    var $scripts,
    result  = document.createDocumentFragment(),
    scripts = result.scripts = document.createDocumentFragment();
    
    $frag.innerHTML = data ? this.fillTemplate(template, data) : template;
    $scripts = $frag.getElementsByTagName('script');
    
    while ($scripts[0]) {
        scripts.appendChild($scripts[0]);
    }
    
    while ($frag.firstChild) {
        result.appendChild($frag.firstChild);
    }
    
    $frag.innerHTML = '';
    return result;
},

/**
 * parse JSON String to a Object
 * 
 * @param {String} json  the JSON string
 * 
 * @return {Object}
 */
parseJSON = function(json) {
    if (typeof json != 'string' || !json) return NULL;
    
    try {
        return (new Function('return ' + json))();
    } catch (e) {
        error(e);
        return NULL;
    }
},

/**
 * append html to the dom element
 * 
 * @param {Element} node  the dom element
 * @param {String}  html  html code without <script>code</script>
 * 
 * @return {Element} the dom element
 */
appendHTML = function(node, html){
    var frag = parseHTML(html);
    node.appendChild(frag);
    return node;
},

cssClass = function(node, names, remove){
    remove = !!remove;
    if (!node.className) {
        if (!remove) node.className = names;
    } else {
        names = (names || '').split(/\s+/);
        var name,
        i = 0,
        l = names.length,
        space = ' ',
        result = space + node.className.replace(/[\n\t]/g, space) + space;
        for (; i < l; i++) {
            name = names[i] + space;
            if (remove) result = result.replace(space + name, space);
            else if (result.indexOf(space + name) < 0) result += name;
        }
        node.className = result.replace(/^\s+|\s+$/g, '');
    }
},

/**
 * xMobi: Mobile JavaScript Library
 */
xMobi = window.xMobi = {
    version: function(){return version;},
    // Util
    call:         call,
    extend:       extend,
    timeStamp:    timeStamp,
    runScript:    runScript,
    fillTemplate: fillTemplate,
    parseHTML:    parseHTML,
    parseJSON:    parseJSON,
    appendHTML:   appendHTML,
    
    // Browser Helper
    bindEvent:      bind,
    unbindEvent:    unbind,
    stopEvent:      stopEvent,
    isLandscape:    isLandscape,
    getOrientation: getOrientation,
    addClass: function(node, names){
        cssClass(node, names);
    },
    delClass: function(node, names){
        cssClass(node, names, true);
    },
    
    /**
     * check device is portrait
     * 
     * @return {Boolean}
     */
    isPortrait: function(){
        return !this.isLandscape();
    },
    
    /**
     * lock or unlock scroll page
     * 
     * @param {Boolean} lock
     */
    lockScroll: function(lock){
        browse.scroll = arguments.length ? !!lock : true;
    },
    
    /**
     * register event handler for dom elementds be readied
     * 
     * @param {Function} handler the event handler
     */
    onReady: (function(){
        var readyEvent, readyHandler, isReady, stack = [];
        
        function ready(){
            if (!isReady) {
                isReady = true;
                readyHandler && unbind(document, readyEvent, readyHandler);
                runStack(stack, document);
            }
        }
        
        if (document.addEventListener) {
            readyEvent = 'DOMContentLoaded';
            readyHandler = ready;
        } else if (document.attachEvent) {
            readyEvent = 'readystatechange';
            readyHandler = function() {
                if (document.readyState === 'complete') ready();
            };
        }
        readyHandler && bind(document, readyEvent, readyHandler);
        bind(window, 'load', ready);
        
        return function(handler){
            if (handler) {
                isReady ? handler.call(document) : stack.push(handler);
            }
            return isReady;
        };
    })(),
    
    /**
     * register event handler for device orientation change
     * 
     * @param {Function} event handler, handler param: orientation=(landscape|portrait)
     */
    onOrientation: (function(){
        function handler(){
            var _state = getOrientation();
            if (_state != state) runStack(stack, window, state = _state);
        }
        
        var stack = [],
        state = getOrientation(),
        eventName = 'orientationchange';
        
        return hdlRegister(stack, function(){
            bind(window, 'on' + eventName in window ? eventName : 'resize', handler);
        });
    })(),
    
    /**
     * register event handler for swipe on the screen
     * 
     * @param {Element}  node     the dom element
     * @param {Function} handler  event handler, handler param: direction=(left|right)
     */
    onSwipe: (function(){
        return hdlRegister('swipe', touchInit);
    })(),
    
    /**
     * register event handler for tap on the screen
     * 
     * @param {Element}  node     the dom element
     * @param {Function} handler  event handler, handler param: event
     */
    onTap: (function(){
        return hdlRegister('tap', touchInit);
    })(),
    
    /**
     * set node be dragable
     * 
     * @param {Element} node    the dom element
     * @param {Boolean} enable  is dragable
     */
    dragable: function(node, enable){
        node && (node.dragable = arguments.length === 1 ? true : !!enable) && runInit(touchInit);
    },
    
    /**
     * register event handler for drag element, one element only can have one drag handler
     * 
     * @param {Element}  node     the dom element
     * @param {Function} handler  event handler, handler param: event
     */
    onDrag: (function(){
        return hdlRegister('drag', touchInit, true);
    })(),
    
    /**
     * set node be scrollable
     * 
     * @param {Element} node     the dom element
     * @param {Element} trigger  the dom element
     * @param {Boolean} enable   is scrollable
     */
    scrollable: (function(){
        var scrollHeight = 0, scrollWidth = 0;
        
        function scroll(node, trigger, data){
            var
            left = scrollWidth + data.dx,
            top = scrollHeight + data.dy,
            minLeft = Math.max(0, node.offsetWidth - trigger.offsetWidth),
            minTop  = Math.max(0, node.offsetHeight - trigger.offsetHeight);
            
            left = data.dx < 0
                ? 0 - Math.min(Math.abs(left), minLeft)
                : Math.min(left, 0);
            
            top = data.dy < 0
                ? 0 - Math.min(Math.abs(top), minTop)
                : Math.min(top, 0);
            
            node.style.left = left + 'px';
            node.style.top  = top + 'px';
        }
        
        function start(node){
            scrollHeight = node.offsetTop;
            scrollWidth  = node.offsetLeft;
        }
        
        return function(node, trigger, enable){
            if (!('scrollable' in node)) {
                // bind event handler
                bind(trigger, support.touch ? 'touchstart' : 'mousedown', function(){
                    node.scrollable && start(node);
                });
                xMobi.onDrag(trigger, function(data){
                    node.scrollable && scroll(node, trigger, data);
                });
            }
            xMobi.dragable(trigger, node.scrollable = arguments.length === 2 ? true : !!enable);
        }
    })(),
    
    /**
     * GEO Support
     * Error Code:
     * - UNSUPPORT = 0;
     * - PERMISSION_DENIED = 1;
     * - POSITION_UNAVAILABLE = 2;
     * - TIMEOUT = 3;
     * 
     * @see http://www.w3.org/TR/geolocation-API/
     */
    GEO: (function(){
        var
        stack  = {},
        $geo   = geo || geoBB,
        mWatch = geo ? 'watchPosition' : geoBB ? 'onLocationUpdate'     : '',
        mStop  = geo ? 'clearWatch'    : geoBB ? 'removeLocationUpdate' : '';
        
        function bbPosition(error){
            var
            latitude  = geoBB.latitude,
            longitude = geoBB.longitude;
            
            if (!latitude || !longitude) {
                error && error({code: 2});
                return NULL;
            }
            return {
                timestamp: geoBB.timestamp,
                coords: {
                    latitude: latitude,
                    longitude: longitude
                }
            };
        }
        
        return {
            /**
             * register event handler for watch geo location change
             * 
             * @param {Function} event handler, handler param: position
             * @param {Function} error handler, handler param: error
             * 
             * @return {Integer} watch id for stop watch, this also store in success._wid
             */
            watch: function(success, error, options){
                if (typeof error !== 'function') error = NULL;
                if ($geo && typeof success === 'function') {
                    var $success = geo ? success : geoBB ? function(){
                        var position = bbPosition(error);
                        position && success(position);
                    } : FN,
                    wid = $geo[mWatch]($success, function(e){
                        geoError(e);
                        error && error(e);
                    }, options || {}) || timeStamp();
                    stack[wid] = $success;
                    return success._wid = wid;
                } else if (error) {
                    error({code: 0});
                }
                return 0;
            },
            
            /**
             * stop watch a geo location change event handler
             * 
             * @param {Integer} wid  watch id
             */
            stopWatch: function(wid){
                var $wid = geo ? wid : stack[wid];
                if ($geo && $wid) {
                    $wid && $geo[mStop]($wid);
                    delete stack[wid];
                }
            },
            
            /**
             * register event handler for get geo location
             * 
             * @param {Function} event handler, handler param: position
             * @param {Function} error handler, handler param: error
             */
            location: function(success, error, options){
                if (typeof error != 'function') error = NULL;
                if ($geo && typeof success === 'function') {
                    if (geo) geo.getCurrentPosition(success, function(e){
                        geoError(e);
                        error && error(e);
                    }, options || {});
                    else if (geoBB) {
                        var position = bbPosition(error);
                        position && success(position);
                    }
                } else if (error) {
                    error({code: 0});
                }
            }
        }
    })(),
    
    /**
     * for Apple Device
     * 
     * iPhone, iPod Touch, iPad
     */
    Apple: {
        /**
         * set page as a apple web application
         * 
         * @param {Object} options  app options
         */
        webApp: function(options){
            if (!browse.apple) return;
            
            var extHead = '';
            
            options = extend({
                addGlossToIcon: true,
                icon: NULL,
                startupScreen: NULL,
                fixedViewport: true,
                fullScreen: true,
                statusBar: 'default' // other options: black-translucent, black
            }, options || {});
            
            // set icon
            if (options.icon) {
                extHead += '<link rel="apple-touch-icon'
                        + (options.addGlossToIcon ? '' : '-precomposed')
                        + '" href="' + options.icon + '" />';
            }
            
            // set startup screen
            if (options.startupScreen) {
                extHead += '<link rel="apple-touch-startup-image" href="' + options.startupScreen + '" />';
            }
            
            // set viewport
            if (options.fixedViewport) {
                extHead += '<meta name="viewport" content="width=device-width,height=device-height,user-scalable=0,initial-scale=1.0,maximum-scale=1.0"/>';
            }
            
            // set full-screen
            if (options.fullScreen) {
                extHead += '<meta name="apple-mobile-web-app-capable" content="yes" />';
                if (options.statusBar) {
                    extHead += '<meta name="apple-mobile-web-app-status-bar-style" content="' + options.statusBar + '" />';
                }
            }
            
            if (extHead) appendHTML($head, extHead);
        }
    }
};

/**
 * Browser Support Check
 */
(function(){
var key, BSupport = xMobi.Support = {};
function genFn(key) {
    return function(){
        return support[key];
    }
}
for (key in support) {
    BSupport[key] = genFn(key);
}
})();

xMobi.onReady(function(){
    $body = document.body;
    support.touch && bind($body, 'touchmove', function(event){
        browse.scroll && event.preventDefault();
    });
});

})(window);

