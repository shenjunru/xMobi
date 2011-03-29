/*!
 * xMobi - Mobile JavaScript Library
 * version 1.0 beta 2011-3-29
 * 
 * Copyright 2011, Shen Junru
 * Released under the MIT License.
 * http://github.com/xfsn/xMobi
 */
(function(window, undefined){

var
version  = '1.0 beta',
NULL     = null,
FALSE    = false,
TRUE     = true,
$body    = NULL,
FN       = function(){},
document = window.document,
$head    = document.getElementsByTagName('head')[0],
$docEl   = document.documentElement,
$frag    = document.createElement('div'),
UA       = navigator.userAgent,
GEO      = navigator.geolocation,
BB       = window.blackberry,
OPERA    = window.opera,
BBGeo    = (BB || {}).location,
support  = {
    geo:                  !!GEO || !!BBGeo,
    gesture:              !!window.GestureEvent,
    touch:                !!window.TouchEvent,
    WebKitCSSMatrix:      !!window.WebKitCSSMatrix,
    WebKitAnimationEvent: !!window.WebKitTransitionEvent
},
browser  = (function(flag){
    return {
        scroll:      FALSE,
        BlackBerry:  flag ? FALSE : (flag = !!BB),
        Apple:       flag ? FALSE : (flag = support.touch && /iP(ad|od|hone)/.test(UA)),
        Android:     flag ? FALSE : (flag = support.touch && /Android/.test(UA)),
        OperaMini:   flag ? FALSE : (flag = !!OPERA && /Opera Mini/.test(UA)),
        OperaMobile: flag ? FALSE : (flag = !!OPERA && /Opera Mobi/.test(UA))
    };
})(),

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
 * proxy a function
 * 
 * @param {Function} fn        a function
 * @param {Object}   instance  a instance
 */
proxy = function(fn, instance){
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
            (event.preventDefault || set).call(event, 'returnValue', FALSE);
            (event.stopPropagation || set).call(event, 'cancelBubble', TRUE);
            event.stoped = TRUE;
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
    var fnName, exName = FALSE;
    
    ((fnName = 'addEventListener') in document)
    || ((exName = TRUE) && (fnName = 'attachEvent') in document)
    || (fnName = '');
    
    return function(node, event, handler, dom0){
        var special = /^DOM/.test(event);
        if (node && event && handler) {
            if (!special && (dom0 || exName)) event = 'on' + event;
            if (!special && (dom0 || !fnName)) node[event] = handler;
            else fnName && node[fnName](event, handler, FALSE);
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
    var fnName, exName = FALSE;
    
    ((fnName = 'removeEventListener') in document)
    || ((exName = TRUE) && (fnName = 'detachEvent') in document)
    || (fnName = '');
    
    return function(node, event, handler, dom0){
        var special = /^DOM/.test(event);
        if (node && event && handler) {
            if (!special && (dom0 || exName)) event = 'on' + event;
            if (!special && (dom0 || !fnName)) node[event] = NULL;
            else fnName && node[fnName](event, handler, FALSE);
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
 * @return {Function} event handler register function
 */
hdlRegister = function(type, init, one){
    var isArray = type instanceof Array;
    return type ? function(node, handler){
        var stack = type;
        if (isArray) handler = node;
        else stack = initEventStack(node, type);
        if (one) stack.length = 0;
        typeof handler === 'function' && stack.push(handler);
        init && runInit(init, type);
    } : FN;
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
 * 
 * @param {String} key  touch event name
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
    
    var
    /**
     * get an array of touche event objects
     * @param {Event} event  event object
     * @return {Array}
     */
    getTouches = function(event){
        return support.touch ? event.touches || [] : [event];
    },
    /**
     * get first touch touch event object
     * @param {Event} event  event object
     * @return {TtouchEvent|Event}
     */
    getTouch = function(event){
        return support.touch ? event.targetTouches[0] || {} : event;
    },
    /**
     * get touch's identifier
     * @param {TtouchEvent|Event} touch  touch event object
     * @return {Number} identifier
     */
    getTouchId = function(touch){
        return touch.identifier || 0;
    },
    /**
     * return the click position of the page
     * @param {TtouchEvent|Event} touch  touch event object
     * @return {Object} {x,y}
     */
    getPosition = function(touch) {
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
    },
    /**
     * get touch start data by touch event object
     * @param {TtouchEvent|Event} touch  touch event object
     * return {Object} {x,y,time,node}
     */
    getTauchData = function(touch){
        return (touchData || {})[getTouchId(touch)];
    },
    /**
     * get touch relate data
     * @param {Event}             event  event object
     * @param {TtouchEvent|Event} touch  touch event object
     * @return {Object} {x,y,time,node}
     */
    getData = function(event, touch){
        var pos = getPosition(touch);
        return {
            time: event.timeStamp || timeStamp(),
            node: touch.target || touch.srcElement,
            x: pos.x,
            y: pos.y
        };
    },
    /**
     * exec iterator for each touch event object
     * @param {Event}    event     event object
     * @param {Function} iterator  iterator function
     * @return {Number} number of touch event object
     */
    eachTouch = function(event, iterator){
        var touch, i = 0, touches = getTouches(event);
        while ((touch = touches[i++])) iterator(event, touch);
        return touches.length;
    },
    /**
     * get delta data by touch move
     * @param {TtouchEvent|Event} touch  touch event object
     * @param {Number}            time   timestamp of touch move event
     * @param {Object}            start  touch start data
     * @return {Object|null} {dx,dy,dtime,node}
     */
    getDelta = function(touch, time, start){
        var pos = getPosition(touch);
        start = start || getTauchData(touch);
        return start ? {
            node: start.node,//touch.target || touch.srcElement,
            dtime: time - start.time,
            dx: pos.x - start.x,
            dy: pos.y - start.y
        } : NULL;
    },
    /**
     * check event is multi-touch event
     * @param {Event} event  event object
     * @return {Boolean}
     */
    isMultiTouch = function(event){
        return getTouches(event).length > 1;
    },
    /**
     * get dragable node or it's ancestor node
     * @param {Element} node  where to start check
     * @return {Element|null}
     */
    getDragable = function(node){
        do {
            if (node.dragable) return node;
        } while((node = node.parentNode) && (node !== $docEl));
    },
    /**
     * calculate the new position for moving element
     * @param {Object} data  the position data
     * @return {Object} new position {x,y}
     */
    newPosition = function(data){
        return {
            x: data.x + data.dx,
            y: data.y + data.dy
        };
    },
    /**
     * move the element
     * @param {Element} node  the element to move
     * @param {Object}  data  the position data, this is not the final position data
     */
    move = function(node, data){
        // call custom drag event handler or newPosition to calculate the new position data
        data = proxy(getEventStack(node, 'drag')[0] || newPosition, node, data, newPosition);
        if (data) {
            node.style.left = data.x + 'px';
            node.style.top = data.y + 'px';
        }
    },
    /**
     * unbind touchMove and touchEnd event handler
     */
    release = function(){
        unbind($docEl, moveEvent, touchMove);
        unbind($docEl, endEvent,  touchEnd);
    },
    /**
     * event handler: touchStart
     * @param {Event} event  event object
     */
    touchStart = function(event){
        event = event || window.event;
        touchData = {}, dragable = moved = FALSE, tapNode = NULL;
        eachTouch(event, function(event, touch){
            var data = touchData[getTouchId(touch)] = getData(event, touch),
            node = tapNode = data.node;
            if (node = getDragable(node)) {
                dragable    = dragable || TRUE;
                data.node   = node;
                data.offset = {
                    x: node.offsetLeft,
                    y: node.offsetTop
                };
            }
        }) > 1 && (tapNode = NULL);
        dragable && stopEvent(event);
        bind($docEl, moveEvent, touchMove);
        bind($docEl, endEvent,  touchEnd);
    },
    /**
     * event handler: touchMove
     * @param {Event} event  event object
     */
    touchMove = function(event) {
        moved = TRUE, event = event || window.event;
        var data, time = event.timeStamp || timeStamp();
        if (dragable) {
            stopEvent(event);
            eachTouch(event, function(event, touch){
                data = getTauchData(touch);
                var node = data.node,
                offset   = data.offset;
                if (node.dragable && offset && (data = getDelta(touch, time, data))) {
                    // move element
                    move(node, {
                        x:  offset.x,
                        y:  offset.y,
                        dx: data.dx,
                        dy: data.dy
                    });
                }
            });
        } else if (!isMultiTouch(event)) {
            if (data = getDelta(getTouch(event), time)) {
                var node = data.node,
                absX = Math.abs(data.dx),
                absY = Math.abs(data.dy);
                
                if (absX > absY && (absX > 60) && data.dtime < 1000) {
                    release();
                    runStack(getEventStack(node, 'swipe'), node, data.dx < 0 ? 'left' : 'right', event);
                }
            }
        }
    },
    /**
     * event handler: touchEnd
     * @param {Event} event  event object
     */
    touchEnd = function(event){
        release();
        if (!moved && tapNode) runStack(getEventStack(tapNode, 'tap'), tapNode, event || window.event);
    };
    
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
    proxy:        proxy,
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
        cssClass(node, names, TRUE);
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
        browser.scroll = arguments.length ? !!lock : TRUE;
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
                isReady = TRUE;
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
        eventName = ('on' + eventName) in window ? eventName : 'resize';
        
        return hdlRegister(stack, function(){
            bind(window, eventName, handler);
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
        node && (node.dragable = arguments.length === 1 ? TRUE : !!enable) && runInit(touchInit);
    },
    
    /**
     * register event handler for drag element, one element only can have one drag handler
     * 
     * @param {Element}  node     the dom element
     * @param {Function} handler  event handler, handler param: event
     */
    onDrag: (function(){
        return hdlRegister('drag', touchInit, TRUE);
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
        
        function scroll(node, data){
            var
            wrap = node.parentNode,
            left = scrollWidth  + data.dx,
            top  = scrollHeight + data.dy,
            minLeft = Math.max(0, node.offsetWidth  - wrap.offsetWidth),
            minTop  = Math.max(0, node.offsetHeight - wrap.offsetHeight);
            
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
        
        return function(node, enable){
            if (!('scrollable' in node)) {
                // bind event handler
                bind(node, support.touch ? 'touchstart' : 'mousedown', function(){
                    node.scrollable && start(node);
                });
                xMobi.onDrag(node, function(data){
                    node.scrollable && scroll(node, data);
                });
            }
            xMobi.dragable(node, node.scrollable = arguments.length === 1 ? TRUE : !!enable);
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
        $GEO   = GEO || BBGeo,
        mWatch = GEO ? 'watchPosition' : BBGeo ? 'onLocationUpdate'     : '',
        mStop  = GEO ? 'clearWatch'    : BBGeo ? 'removeLocationUpdate' : '';
        
        function bbPosition(error){
            var
            latitude  = BBGeo.latitude,
            longitude = BBGeo.longitude;
            
            if (!latitude || !longitude) {
                error && error({code: 2});
                return NULL;
            }
            return {
                timestamp: BBGeo.timestamp,
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
                if ($GEO && typeof success === 'function') {
                    var $success = GEO ? success : BBGeo ? function(){
                        var position = bbPosition(error);
                        position && success(position);
                    } : FN,
                    wid = $GEO[mWatch]($success, function(e){
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
                var $wid = GEO ? wid : stack[wid];
                if ($GEO && $wid) {
                    $wid && $GEO[mStop]($wid);
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
                if ($GEO && typeof success === 'function') {
                    if (GEO) GEO.getCurrentPosition(success, function(e){
                        geoError(e);
                        error && error(e);
                    }, options || {});
                    else if (BBGeo) {
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
     * for Apple Device: iPhone, iPod Touch, iPad
     */
    Apple: {
        /**
         * set page as a apple web application
         * 
         * @param {Object} options  app options
         */
        webApp: function(options){
            if (!browser.apple) return;
            
            var extHead = '';
            
            options = extend({
                addGlossToIcon: TRUE,
                icon: NULL,
                startupScreen: NULL,
                fixedViewport: TRUE,
                fullScreen: TRUE,
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
var key,
Support = xMobi.Support = {},
Browser = Support.Browser = {};
function genSupport(key) {
    return function(){
        return support[key];
    };
}
function genBrowser(key) {
    return function(){
        return browser[key];
    };
}
for (key in support) Support[key] = genSupport(key);
for (key in browser) Browser[key] = genBrowser(key);
})();

support.touch && bind($docEl, 'touchmove', function(event){
    browser.scroll && event.preventDefault();
});

})(window);
