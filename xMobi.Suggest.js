/*!
 * xMobi - Suggest Module
 * version 1.0 beta 2011-3-29
 * 
 * Copyright 2011, Shen Junru
 * Released under the MIT License.
 * http://github.com/xfsn/xMobi
 */

(function(window, document, xMobi){
if (!xMobi) throw new Error('xMobi.Suggest requires including xMobi library');

var
FN   = function(){},
NULL = null,
_version = '1.0 beta',
_keyCode = {
    TAB:          9,
    ENTER:        13,
    ESCAPE:       27,
    SPACE:        32,
    PAGE_UP:      33,
    PAGE_DOWN:    34,
    LEFT:         37,
    UP:           38,
    RIGHT:        39,
    DOWN:         40,
    NUMPAD_ENTER: 108
},

/**
 * proxy a function
 * 
 * @param {Function} fn        a function
 * @param {Object}   instance  a instance
 */
$proxy = xMobi.proxy,

/**
 * event handler
 * 
 * @param {Event}   event     event object
 * @param {Suggest} instance  Suggest instance
 */
$keyDown = function(event, instance) {
    event = event || window.event;
    var key = event.keyCode;
    if (((key == _keyCode.UP) || (key == _keyCode.DOWN)) && !instance.hasResult()) key = null;
    switch(key) {
        case _keyCode.LEFT:
        case _keyCode.RIGHT:
            break;
        case _keyCode.UP:
            instance.prev();
            xMobi.stopEvent(event);
            break;
        case _keyCode.DOWN:
            instance.next();
            xMobi.stopEvent(event);
            break;
        case _keyCode.ENTER:
        case _keyCode.NUMPAD_ENTER:
            instance.options.lockEnter && xMobi.stopEvent(event);
        case _keyCode.TAB:
            if (instance.isActived()) {
                instance.select(instance.curIndex());
                xMobi.stopEvent(event);
            } else if (instance.options.force && !instance.selected) {
                instance.value('');
            }
            break;
        case _keyCode.ESCAPE:
            instance.value(instance.options.force && instance.curIndex() < 0 ? '' : self.term);
            instance.close();
            break;
        default:
            // keypress is triggered before the input value is changed
            clearTimeout(instance.searching);
            instance.searching = setTimeout(function(){
                var element = event.target || event.srcElement,
                value = element.value;
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
$bind = function(node, events, dom0){
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
$visible = function(node){
    return node.offsetWidth > 0 || node.offsetHeight > 0;
},

/**
 * normalize a item object
 * 
 * @param {String,Object} item
 * 
 * @return {Object} item object
 */
$normalize = function(item){
    return {
        label: item.label || item.text || item,
        text:  item.text  || item,
        value: item.value || item
    };
},

/**
 * escape special character for regular express
 * 
 * @param {String} value
 * 
 * @return {String}
 */
$escapeRegex = function(value) {
    return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
},

/**
 * return all term matched item from an array
 * 
 * @param {Array}  array  an array
 * @param {String} term   term for match
 */
$filter = function(array, term) {
    var matcher = new RegExp($escapeRegex(term), 'i'),
    results = [], i = 0, l = array.length, item;
    for (; i < l; i++) {
        item = array[i];
        if (matcher.test(item.text || item.value || item)) {
            results.push(item);
        }
    }
    return results;
},

$scrollIntoView = function(node, alignTop, wrap){
    wrap = wrap || node.parentNode;
    var tHeight = wrap.offsetHeight,
        iHeight = node.offsetHeight,
        iTop = node.offsetTop,
        sTop = wrap.scrollTop;
    
    wrap.scrollTop = alignTop
        ? (iTop < sTop ? sTop - iHeight : wrap.scrollHeight)
        : ((iTop + iHeight) > (sTop + tHeight) ? sTop + iHeight : 0);
},

/**
 * Class: Suggest
 * 
 * @param {Object} options  initialize options
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
        // prevent default action of press enter key
        lockEnter: true,
        // value must from search results
        force:  false,
        // initialize immediately
        init:   true,
        // tip for the input element
        tip:    '',
        
        // callback functions
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
        // key down in the input
        keyDown: NULL,
        // no data matched
        noMatch: NULL
    }, options || {});
    
    self.term      = '';
    self.curItem   = NULL;
    self.orgItem   = NULL;
    self.uiInput   = uiInput;
    self.uiResults = uiResults;
    self.disabled  = false;
    self.actived   = false;
    self.selected  = false;
    
    self.uiInput.setAttribute('autocomplete', 'off');
    options.init && self.init();
};
Suggest.version = function(){return _version;};
Suggest.proxy   = $proxy;
Suggest.filter  = $filter;
Suggest.normalize   = $normalize;
Suggest.constructor = Suggest;
Suggest.prototype = {
    /**
     * initialize
     */
    init: function(){
        var self = this, options = self.options;
        self.bindSource(options.source);
        
        $bind(self.uiInput, {
            keydown: function(event){
                if (!self.disabled) {
                    self.onKeyDown(event, this);
                    $keyDown(event, self);
                }
            },
            focus: function(event){
                if (!self.disabled) {
                    if (this.value == self.options.tip) this.value = '';
                    self.prevTerm = this.value;
                    self.onFocus(event, this);
                }
            },
            blur: function(event){
                if (!self.disabled) {
                    clearTimeout(self.searching);
                    // clicks on the menu (or a button to trigger a search) will cause a blur event
                    self.closing = setTimeout(function(){
                        self.close();
                    }, 150);
                    self.showTip();
                    self.onBlur(event, this);
                }
            }
        });
        
        self.showTip();
    },
    
    /**
     * show the tip, if needed
     */
    showTip: function(){
        if (this.options.tip && !/\S/.test(this.uiInput.value)) this.uiInput.value = this.options.tip;
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
                self.onStart();
                self.response($filter(source, term));
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
        self.selected  = false;
        if (term.length >= self.options.chars) {
            clearTimeout(self.closing);
            self.term = term;
            self.orgItem = $normalize(term);
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
            self.onOpen(items);
        } else {
            self.onNoMatch();
            self.close();
        }
    },
    
    /**
     * render result items
     * 
     * @param {Array} items  items data
     */
    render: function(items){
        var self = this, results = self.genResults();
        self._render(items, results.object, results.method);
        self.uiResults.innerHTML = '';
        self.uiResults.appendChild(results.object);
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
            self.actived = true;
            
            self.onRender(items);
            
            for (; item = items[i]; i++) {
                self.items.push(item = $normalize(item));
                results[method](item.ui = self.genItem(item, i));
                item.index = i;
            }
        }
    },
    
    /**
     * generate the results collection object
     * 
     * @return {Object} results object
     */
    genResults: function(){
        return {
            object: document.createElement('ul'),
            method: 'appendChild'
        };
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
        uiItem.innerHTML = item.label || item.text || item;
        uiItem.itemIndex = index;
        return $bind(uiItem, {
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
        if (self.hasResult()) {
            self.mark(++index >= self.items.length ? (self.options.force ? 0 : -1) : index, false);
        }
    },
    
    /**
     * mark previous item
     */
    prev: function(){
        var self = this, index  = self.curIndex();
        if (self.hasResult()) {
            self.mark(--index < (self.options.force ? 0 : -1) ? self.items.length - 1 : index, true);
        }
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
    mark: function(index, alignTop){
        var self = this,
        item    = self.item(index),
        last    = self.curItem || {},
        current = item || last;
        if (last !== current && false !== self.onMark(last, current, alignTop)) {
            self.curItem = item;
            self.value(current.text || '');
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
            self.selected = true;
            if (false !== self.onSelect(item, self.uiInput)) {
                self.curItem = item;
                self.value(item.text || '');
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
        this.actived = false;
        this.clean();
        this.onClose();
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
     * reset
     */
    reset: function(){
        this.uiInput.value = '';
        this.close();
    },
    
    /**
     * check Suggest is actived or not
     * 
     * @return {Boolean}
     */
    isActived: function(){
        return this.actived && $visible(this.uiResults);
    },
    
    /**
     * show the results list
     */
    showResults: function(){
        this.uiResults.style.display = 'block';
    },
    
    /**
     * hide the results list
     */
    hideResults: function(){
        this.uiResults.style.display = 'none';
    },
    
    /**
     * check result exists
     * 
     * @return {Boolean}
     */
    hasResult: function(){
        return this.items && this.items.length;
    },
    
    // callback functions
    onFocus: function(event, input){
        return $proxy(this.options.focus, this, event, input);
    },
    onBlur: function(event, input){
        return $proxy(this.options.blur, this, event, input);
    },
    onStart: function(){
        return $proxy(this.options.start, this);
    },
    onOpen: function(items){
        return $proxy(this.options.open, this, items);
    },
    onClose: function(){
        return $proxy(this.options.close, this);
    },
    onRender: function(items){
        return $proxy(this.options.render, this, items);
    },
    onMark: function(last, current, alignTop){
        if (last.ui)    xMobi.delClass(last.ui, 'selected');
        if (current.ui) {
            xMobi.addClass(current.ui, 'selected');
            $scrollIntoView(current.ui, !!alignTop, this.uiResults);
        }
        return $proxy(this.options.mark, this, last, current, alignTop);
    },
    onSelect: function(item, input){
        return $proxy(this.options.select, this, item, input);
    },
    onKeyDown: function(event, input){
        return $proxy(this.options.keyDown, this, event, input);
    },
    onNoMatch: function(){
        return $proxy(this.options.noMatch, this);
    }
};

})(window, document, xMobi);
