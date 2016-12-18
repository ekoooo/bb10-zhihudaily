var App = {
    initApp: function() {
        bb.pushScreen('app.html', 'app');

        this.attachEvent();
    },
    attachEvent: function() {
        $(document).on('bb_ondomready', function(e, paras) {
            console.log(ZhihuDaily.getLatestNewsObj());
        });
    }
};

var DateTools = {
    /**
     * 获取当前日期, 格式 2016-11-06
     * @return {[string]}
     */
    getCurrentDateStr: function() {
        return this.getDate(new Date());
    },
    /**
     * 获取下一天的时间戳
     * @param {[string]} date 格式 2016-11-06 06:59:58
     */
    getNextDateTSP: function(date) {
        return +new Date(date) + 86400000;
    },
    /**
     * 获取上一天的时间戳
     * @param {[string]} date 格式 2016-11-06 06:59:58
     */
    getPreDateTSP: function(date) {
        return  +new Date(date) - 86400000;
    },
    /**
     * 获取下一天
     * @return {[string]} 格式 2016-11-06
     */
    getNextDateStr: function(date) {
        return this.getDate(new Date(this.getNextDateTSP(date)));
    },
    /**
     * 获取上一天
     * @return {[string]} 格式 2016-11-06
     */
    getPreDateStr: function(date) {
        return this.getDate(new Date(this.getPreDateTSP(date)));
    },
    /**
     * 获取 2016-11-06 格式日期
     * @param  {[Date]} date
     * @return {[string]}
     */
    getDate: function(date) {
        var m = date.getMonth() + 1;
        var d = date.getDate();
        return date.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
    }
};

var ZhihuDaily = {
    /**
     * 知乎日报 API
     */
    APIs: {
        "latest"        : "http://news-at.zhihu.com/api/4/news/latest",                     // 最新消息
        "hot"           : "http://news-at.zhihu.com/api/3/news/hot",                        // 热门消息
        "before"        : "http://news-at.zhihu.com/api/4/news/before/#{para}",             // 过往消息, para 格式 20131119, 获取的消息为上一天, 即 20131118 消息
        "news"          : "http://news-at.zhihu.com/api/4/news/#{para}",                    // 消息内容
        "themes"        : "http://news-at.zhihu.com/api/4/themes",                          // 主题日报列表
        "theme"         : "http://news-at.zhihu.com/api/4/theme/#{para}",                   // 主题日报内容
        "sections"      : "http://news-at.zhihu.com/api/3/sections",                        // 栏目总览
        "section"       : "http://news-at.zhihu.com/api/3/section/#{para}",                 // 栏目具体消息
        "story-extra"   : "http://news-at.zhihu.com/api/4/story-extra/#{para}",             // 额外信息
        "long-comments" : "http://news-at.zhihu.com/api/4/story/#{para}/long-comments",     // 新闻对应长评论
        "short-comments": "http://news-at.zhihu.com/api/4/story/#{para}/short-comments",    // 新闻对应短评论
        "recommenders"  : "http://news-at.zhihu.com/api/4/story/#{para}/recommenders",      // 新闻的推荐者
    },
    DATE_SUFFIX: " 06:59:58", // api 日期中固定时间
    AJAX_GET_TIME_OUT: 5000, // api 请求过期时间
    /**
     * 替换 api 中 #{para} 参数
     * @param  {[string]} api 带 #{para} 参数的 url
     * @param  {[string]} para 参数
     * @return {[string]} 完整 api url
     */
    getAPIURL: function(api, para) {
        return api.replace('#{para}', para);
    },
    /**
     * 获取开始时间时间戳, 用于 api 中时间戳参数
     * @param  {[string]} date 日期, 格式 2016-11-06
     * @return {[string]} 时间戳
     */
    getStartTimeTSP: function(date) {
        return +new Date(date + this.DATE_SUFFIX);
    },
    /**
     * 获取 '过往消息' 消息信息, 这个方法将调整 api 中获取的是上一天消息的问题
     * @param  {[type]} date 当前日期
     * @return {[type]}
     */
    getBeforeNewsObj: function(date) {
        return this.ajaxGet(this.getAPIURL(this.APIs.before, DateTools.getNextDateStr(date).replace(/-/g, '')));
    },
    getLatestNewsObj: function() {
        var t = this.ajaxGet(this.APIs.latest);
        console.log('bbbb', t);
        return t;
    },
    getHotNewsObj: function() {
        return this.ajaxGet(this.APIs.hot);
    },
    getThemesObj: function() {
        return this.ajaxGet(this.APIs.themes);
    },
    getSectionsObj: function() {
        return this.ajaxGet(this.APIs.sections);
    },
    /**
     * ajax get 同步获取信息
     * @param  {[type]} url [description]
     * @return {[type]}     [description]
     */
    ajaxGet: function(url) {
        var rs = null;
        $.ajax({
            async: false,
            type: 'GET',
            url: url,
            dataType: 'json',
            timeout: this.AJAX_GET_TIME_OUT,
            success: function(data) {
                console.log('aaaaa', data)
                rs = data;
            },
            error: function(xhr, type) {
                console.log(xhr, type);
            }
        });
        console.log('rs', rs)
        return rs;
    }
}

