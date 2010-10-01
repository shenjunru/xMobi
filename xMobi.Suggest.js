/*!
 * xMobi - Suggest Module
 * version 1.0 beta
 * 
 * Copyright 2010, Shen Junru
 * Released under the MIT License.
 * http://github.com/xfsn/xMobi
 * 
 * Date: 2010-10-01
 */

(function(window, undefined){

var
xMobi    = window.xMobi || {},
version  = '1.0 beta',
NULL     = null,
FN       = function(){},
document = window.document,
keyCode  = {
    DOWN: 40,
    ENTER: 13,
    ESCAPE: 27,
    NUMPAD_ENTER: 108,
    PAGE_DOWN: 34,
    PAGE_UP: 33,
    SPACE: 32,
    TAB: 9,
    UP: 38
},
/**
 * event handler
 * 
 * @param {Event}        event     event object
 * @param {Suggest} instance  Suggest instance
 */
keyDown = function(event, instance) {
    if (instance.disabled) return;
    event = event || window.event;
    var element = event.target || event.srcElement;
    switch(event.keyCode) {
        case keyCode.UP:
            instance.prev();
            xMobi.stopEvent(event);
            break;
        case keyCode.DOWN:
            instance.next()
            xMobi.stopEvent(event);
            break;
        case keyCode.ENTER:
        case keyCode.NUMPAD_ENTER:
        case keyCode.TAB:
            if (instance.isActive()) {
                instance.select(instance.curIndex());
                xMobi.stopEvent(event);
            } else if (instance.options.force) {
                instance.value('');
            }
            break;
        case keyCode.ESCAPE:
            instance.value(instance.options.force && instance.curIndex() < 0 ? '' : self.term);
            instance.close();
            break;
        default:
            // keypress is triggered before the input value is changed
            clearTimeout(instance.searching);
            instance.searching = setTimeout(function(){
                var value = element.value;
                // only search if the value has changed
                if (instance.term != value) {
                    instance.search(instance.term = value);
                }
            }, instance.options.delay);
    }
},

/**
 * bind a list of event handlers
 * 
 * @param {Element} node   dom element
 * @param {Object}  events  {event:handler}
 * @param {Boolean} dom0    bind as DOM 0 style
 */
bind = function(node, events, dom0){
    for (var event in events) xMobi.bindEvent(node, event, events[event], dom0);
    return node;
},

/**
 * element is visible
 * 
 * @param {Element} node  a dom element
 * 
 * @return {Boolean}
 */
visible = function(node){
    return node.offsetWidth > 0 || node.offsetHeight > 0;
},

/**
 * normalize a item object
 * 
 * @param {String,Object} item
 * 
 * @return {Object} item object
 */
normalize = function(item){
    return item.label && item.value
        ? item
        : {
            label: item,
            value: item
        };
},

/**
 * escape special character for regular express
 * 
 * @param {String} value
 * 
 * @return {String}
 */
escapeRegex = function( value ) {
    return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
},

/**
 * return all term matched item from an array
 * 
 * @param {Array}  array  an array
 * @param {String} term   term for match
 */
filter = function(array, term) {
    var matcher = new RegExp(escapeRegex(term), 'i'),
    results = [], i = 0, l = array.length, item;
    for (; i < l; i++) {
        item = array[i];
        if (matcher.test(item.label || item.value || item)) {
            results.push(item);
        }
    }
    return results;
},

/**
 * call a function
 * 
 * @param {Function} fn        a function
 * @param {Object}   instance  a instance
 */
call = function(fn, instance){
    if (typeof fn === 'function') try {
        return fn.apply(instance, [].slice.call(arguments, 2));
    } catch (e) {}
},

/**
 * Class: Suggest
 * 
 * @param {Element} uiInput    dom element for input
 * @param {Element} uiResults  dom element for render results
 * @param {Object}  options    initialize options
 */
Suggest = xMobi.Suggest = function(uiInput, uiResults, options){
    var self = this;
    self.options = options = xMobi.extend({
        // minimum characters for search
        chars:  1,
        // time of search delaying, in millisecond
        delay:  250,
        // search source, array or function(trem){return an array of search results}
        source: NULL,
        // value must from search results
        force:  false,
        // initialize immediately
        init:   true,
        
        // callback function
        // input focusing
        focus:  NULL,
        // input bluring
        blur:   NULL,
        // starting search
        start:  NULL,
        // result list opened
        open:   NULL,
        // closing result list
        close:  NULL,
        // starting render result list
        render: NULL,
        // marking item
        mark:   NULL,
        // selecting item 
        select: NULL,
        // no data matched
        noMatch: NULL
    }, options || {});
    
    self.term      = '';
    self.curItem   = NULL;
    self.orgItem   = NULL;
    self.uiInput   = uiInput;
    self.uiResults = uiResults;
    self.disabled  = false;
    self.active    = false;
        
    uiInput.setAttribute('autocomplete', 'off');
    options.init && self.init();
};
Suggest.version = function(){return version;};
Suggest.filter = filter;
Suggest.constructor = Suggest;
Suggest.prototype = {
    /**
     * initialize
     */
    init: function(){
        var self = this, options = self.options;
        self.bindSource(options.source);
        
        bind(self.uiInput, {
            keydown: function(event){
                keyDown(event || window.event, self);
            },
            focus: function(){
                if (!self.disabled) {
                    self.prevTerm = this.value;
                    call(self.options.focus, self);
                }
            },
            blur: function(){
                if (!self.disabled) {
                    clearTimeout(self.searching);
                    // clicks on the menu (or a button to trigger a search) will cause a blur event
                    self.closing = setTimeout(function(){
                        self.close();
                    }, 150);
                    call(self.options.blur, self);
                }
            }
        });
    },
    
    /**
     * bind a source
     * if source is a function, the function parameter is 'term' for search.
     * 
     * @param {Array,Function} source  source of suggest options
     */
    bindSource: function(source) {
        var self = this, array, url;
        if (source instanceof Array) {
            self.source = function(term) {
                self.response(filter(source, term));
            };
        } else {
            self.source = typeof source === 'function' ? source : FN;
        }
    },
    
    /**
     * search results from the source
     * 
     * @param {String} term  term for search
     */
    search: function(term){
        var self = this;
        term = term || '';
        if (term.length >= self.options.chars) {
            clearTimeout(self.closing);
            self.term = term;
            self.orgItem = normalize(term);
            call(self.options.start, self);
            self.source(term);
        } else {
            self.close();
        }
    },
    
    /**
     * callback function to search results
     * 
     * @param {Array} items  items data
     */
    response: function(items){
        var self = this;
        if (items && items.length) {
            self.render(items);
            call(self.options.open, self);
        } else {
            call(self.options.noMatch, self);
            self.close();
        }
    },
    
    normalize: normalize,
    
    /**
     * render result items
     * 
     * @param {Array} items  items data
     */
    render: function(items){
        var self = this, results = document.createDocumentFragment();
        self._render(items, results, 'appendChild');
        self.uiResults.innerHTML = '';
        self.uiResults.appendChild(results);
    },
    
    /**
     * generate ui for all items, and add to results object
     * 
     * @param {Array}  items    items data
     * @param {Object} results  results object
     * @param {String} method   method name for add results to results object
     * 
     * @private
     */
    _render: function(items, results, method){
        if (results && method && results[method]) {
            var self = this, i = 0, item;
            
            self.items   = [];
            self.curItem = NULL;
            self.active  = true;
            
            call(self.options.render, self, items);
            for (; item = items[i]; i++) {
                self.items.push(item = normalize(item));
                results[method](item.ui = self.genItem(item, i));
                item.index = i;
            }
        }
    },
    
    /**
     * generate a new ui of the item
     * 
     * @param {Object}  item   item data
     * @param {Integer} index  item index
     * 
     * @return {Element} item ui
     */
    genItem: function(item, index){
        var self = this, uiItem = document.createElement('li');
        uiItem.innerHTML = item.label;
        uiItem.itemIndex = index;
        return bind(uiItem, {
            click: function(){
                self.select(this.itemIndex);
            }
        }, true);
    },
    
    /**
     * return current selected item index
     * 
     * @return {Integer} item index
     */
    curIndex: function(){
        var index  = (this.curItem || {}).index;
        return isNaN(index) ? -1 : index;
    },
    
    /**
     * mark next item
     */
    next: function(){
        var self = this, index  = self.curIndex();
        self.mark(++index >= self.items.length ? -1 : index);
    },
    
    /**
     * mark previous item
     */
    prev: function(){
        var self = this, index  = self.curIndex();
        self.mark(--index < -1 ? self.items.length - 1 : index);
    },
    
    /**
     * return a item by index
     * 
     * @param {Integer} index  item index
     * 
     * @return {Object} item
     */
    item: function(index){
        return (index === -1 ? this.orgItem : this.items[index]) || NULL;
    },
    
    /**
     * mark a item by index
     * 
     * @param {Integer} index  item index
     */
    mark: function(index){
        var self = this,
        item    = self.item(index),
        last    = self.curItem || {},
        current = item || last;
        if (last !== current && false !== call(self.options.mark, self, last, current)) {
            self.curItem = item;
            self.value(current.label || '');
        }
    },
    
    /**
     * select a item
     * 
     * @param {Integer} index  item index
     */
    select: function(index){
        var self = this, item;
        index = self.options.force && (index === -1) ? 0 : index;
        if (item = self.item(index)) {
            if (false !== call(self.options.select, self, item)) {
                self.curItem = item;
                self.value(item.label || '');
            }
            self.close();
        }
    },
    
    /**
     * set or get the input value
     * 
     * @param {String} value  if this provided, it will set for input
     * 
     * @return {String} the input value
     */
    value: function(value){
        if (arguments.length) this.uiInput.value = value || '';
        return this.uiInput.value;
    },
    
    /**
     * close results list
     */
    close: function(){
        this.active = false;
        this.clean();
        call(this.options.close, this);
    },
    
    /**
     * clean variables
     */
    clean: function(){
        this.term = '';
        this.items = [];
        this.orgItem = NULL;
    },
    
    /**
     * check Suggest is actived or not
     * 
     * @return {Boolean}
     */
    isActive: function(){
        return this.active && visible(this.uiResults);
    }
};

})(window);