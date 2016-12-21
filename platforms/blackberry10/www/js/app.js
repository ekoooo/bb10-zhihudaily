var App = {
    isInitHomeEvt: false,
    initApp: function() {
        bb.pushScreen('app.html', 'latest');
        this.attachEvent();
    },
    attachEvent: function() {
        $(document).on('bb_ondomready', function(e, paras) {
            var id = paras.id;
            if(id === 'latest') {
                ZhihuDaily.initLatestPage();
            }else if(id === 'sections') {
                ZhihuDaily.initSectionsPage();
            }

            if(!this.isInitHomeEvt) {
                // 主页按钮点击监听 (dom 中直接添加 onclick 有问题?)
                $(document).on('click', 'div[class$="-signature-icon"]', function(e) {
                    ActionBarMgr.aTrigger('action_bar_home');
                });

                // 主页滚动监听
                $('.stories_box').on('scroll', function(e) {
                    ZhihuDaily.onStoriesScreenScroll(e);
                });

                this.isInitHomeEvt = true;
            }
        });
    }
};

var DateTools = {
    /**
     * 获取当前日期, 格式 2016-11-06
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
     */
    getDate: function(date) {
        var m = date.getMonth() + 1;
        var d = date.getDate();
        return date.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
    }
};

var ZhihuDaily = {
    is_reading: false, // 是否正在读取数据
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
    IS_SHOW_LOADING: true,
    onStoriesScreenScroll: function() {
        var boxH = $('.bb-screen').height() - bb.screen.getActionBarHeight();
        var topH = $('.stories_box').scrollTop();
        var contentH = $('.stories').height();
        console.log(boxH , topH , contentH);
        if(boxH + topH >= contentH && !this.is_reading) {
            this.is_reading = true;
            this.appendPreDayNews($(document.querySelector('.stories_list:last-child')).attr('data-date'));
        }
    },
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
        return this.ajaxGet(this.APIs.latest);
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
                rs = data;
            },
            error: function(xhr, type) {
                console.log(xhr, type);
            }
        });
        return rs;
    },
    /**
     * 加入消息至主页页面
     * @param  {[type]} storiesObj [description]
     * @param  {[type]} date 显示日期 xxxx-xx-xx
     */
    appendNews2Stories: function(storiesObj, date) {
        date = date || DateTools.getCurrentDateStr();

        var storiesDom = $('.stories');
        var storiesListDom = $('<ul/>').addClass('stories_list').attr('data-date', date).append($('<div class="stories_date">' + date + '</div>'));
        var liTpl = '<li>' +
            '   <a href="javascript: void(0);">' +
            '       <div class="stories_desc"></div>' +
            '       <div class="stories_ico"></div>' +
            '   </a>' +
            '</li>';
        var item, tempLi, len = storiesObj.length;

        for (var i = 0; i < len; i++) {
            item = storiesObj[i];
            tempLi = $(liTpl);
            tempLi.find('a').attr('data-id', item.id);
            tempLi.find('.stories_desc').text(item.title);
            tempLi.find('.stories_ico').css({
                background: 'url(' + item.images[0] + ')'
            });
            storiesListDom.append(tempLi);
        }
        // 如果最后一个消息是单数, 则占一整行
        if(i % 2 !== 0) {
            tempLi.css({
                width: '98%'
            });
        }

        storiesDom.append(storiesListDom);
        // bb.refresh();
    },
    /**
     * 初始化最新消息列表
     */
    initLatestPage: function() {
        this.appendNews2Stories(this.getLatestNewsObj().stories);
        // 用于判断滚动位置
        $('.stories').parent().parent().addClass('stories_box');
    },
    initSectionsPage: function() {

    },
    /**
     * 主页下滑获取前一天数据并显示
     * @param  {[type]} crtDate 当前日期 xxxx-xx-xx
     */
    appendPreDayNews: function(crtDate) {
        this.showLoading();

        var preDate = DateTools.getPreDateStr(crtDate);
        this.appendNews2Stories(this.getBeforeNewsObj(preDate).stories, preDate);
        this.is_reading = false;

        this.removeLoading();
    },
    showLoading: function() {
        if(this.IS_SHOW_LOADING) {
            $('body').append($('<div class="loading">loading...</div>'));
            $('.loading').fadeIn();
        }
    },
    removeLoading: function() {
        if(this.IS_SHOW_LOADING) {
            var loading = $('.loading');
            loading.fadeOut(function() {
                loading.remove();
            });
        }
    }
}

var ActionBarMgr = {
    runing: false,
    aTrigger: function(e) {
        var id = typeof e === 'string' ? e : $(e).attr('id');
        if(!this.runing) {
            switch (id) {
                case 'action_bar_sections':
                    this.runing = true;
                    bb.pushScreen('sections.html', 'sections');
                    this.rundingEnd();
                    break;
                case 'action_bar_home':
                    this.runing = true;
                    bb.pushScreen('app.html', 'latest');
                    this.rundingEnd();
                    break;
                case 'action_bar_themes':
                    break;
                default:
                    break;
            }
        }
    },
    rundingEnd: function() {
        window.setTimeout(function() {
            this.runing = false;
        }.bind(this), 200)
    }
}