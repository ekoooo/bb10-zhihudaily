var App = {
    BB_SCREEN_HEIGHT: 0,
    initApp: function() {
        bb.pushScreen('app.html', 'latest');
        this.attachEvent();
    },
    attachEvent: function() {
        $(document).on('bb_ondomready', function(e, obj) {
            // 在当前 screen 中设置当前 id, 因为一个模板多个地方使用, 需要一个标志
            $(bb.screen.currentScreen).attr('data-screen-flag', obj.id);
            App.BB_SCREEN_HEIGHT = $('.bb-screen').height();

            switch (obj.id) {
                case 'latest':
                    ZhihuDaily.initLatestPage();
                    // 主页滚动监听
                    $('.stories_box').on('scroll', function(e) {
                        ZhihuDaily.onStoriesScreenScroll(e);
                    });
                    break;
                case 'sections':
                    ZhihuDaily.initSectionsPage();
                    break;
                case 'themes':
                    ZhihuDaily.initThemesPage();
                    break;
                case 'hots':
                    ZhihuDaily.initHotsPage();
                    break;
                case 'sections_themes_list':
                    ZhihuDaily.initSectionsThemesListPage(obj);
                    // 主页滚动监听
                    $('.stories_box').on('scroll', function(e) {
                        ZhihuDaily.onStoriesScreenScroll(e);
                    });
                    ActionBarMgr.runing = false;
                    break;
                default:
                    break;
            }
        });

        // 主页按钮点击监听 (dom 中直接添加 onclick 有问题?)
        $(document).on('click', 'div[class$="-signature-icon"]', function(e) {
            ActionBarMgr.aTrigger('action_bar_home');
        });

        // 弹出层关闭操作
        $(document).on('click', '.close_btn', function(e) {
            var mask = $(e.target).parents('.mask');
            mask.fadeOut(function() {
                mask.remove();
            });
        });

        // 点击新闻, 显示内容
        $(document).on('click', '.stories a[data-id]', function(e) {
            ZhihuDaily.viewNews($(e.currentTarget).attr('data-id'));
        });

        // 新闻中图片点击放大
        $(document).on('click', '.content_box img', function(e) {
            BBUtil.initImgZoom($(e.currentTarget).attr('src'));
        });

        // 栏目/主题
        $(document).on('click', '.sections_themes li a', function(e) {
            ShowScreen.sections_themes_list({
                "data-id": $(e.currentTarget).attr('data-id'),
                "data-type": $('.sections_themes').attr('data-type')
            });
        });

        // 点击看评论
        $(document).on('click', '.comments_info', function(e) {
            ZhihuDaily.addMask('comments_mask');
            ZhihuDaily.appendCommentsFrame();
            ZhihuDaily.viewComments($(e.currentTarget).attr('data-id'));

            // 监听切换事件
            $('.comments_mask .show_comments_btn').on('click', function(e) {
                var crt = $(e.currentTarget);
                if(!crt.hasClass('active')) {
                    ZhihuDaily.changeCommentsType(crt);
                }
            });

            // 滚动加载更多
            $('.comments_info_box').on('scroll', function(e) {
                ZhihuDaily.loadMoreComments($(e.currentTarget));
            });
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
     * 获取下一天, 格式 2016-11-06
     */
    getNextDateStr: function(date) {
        return this.getDate(new Date(this.getNextDateTSP(date)));
    },
    /**
     * 获取上一天, 格式 2016-11-06
     */
    getPreDateStr: function(date) {
        return this.getDate(new Date(this.getPreDateTSP(date)));
    },
    /**
     * 获取当前日期, 2016-11-06 格式日期
     */
    getDate: function(date) {
        var m = date.getMonth() + 1;
        var d = date.getDate();
        return date.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
    },
    getTime: function(date) {
        var d = this.getDate(date);

        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();

        h = h < 10 ? '0' + h : h;
        m = m < 10 ? '0' + m : m;
        s = s < 10 ? '0' + s : s;

        return d + ' ' + h + ':' + m + ':' + s;
    }
};

var APIs = {
    "latest" : "http://news-at.zhihu.com/api/4/news/latest", // 最新消息
    "hot" : "http://news-at.zhihu.com/api/3/news/hot", // 热门消息
    "before" : "http://news-at.zhihu.com/api/4/news/before/#{para}", // 过往消息, para 格式 20131119, 获取的消息为上一天, 即 20131118 消息
    "news" : "http://news-at.zhihu.com/api/4/news/#{para}", // 消息内容
    "themes" : "http://news-at.zhihu.com/api/4/themes", // 主题日报列表
    "theme" : "http://news-at.zhihu.com/api/4/theme/#{para}", // 主题日报内容
    "sections" : "http://news-at.zhihu.com/api/3/sections", // 栏目总览
    "section" : "http://news-at.zhihu.com/api/3/section/#{para}", // 栏目具体消息
    "story-extra" : "http://news-at.zhihu.com/api/4/story-extra/#{para}", // 额外信息
    "long-comments" : "http://news-at.zhihu.com/api/4/story/#{para}/long-comments", // 新闻对应长评论
    "short-comments": "http://news-at.zhihu.com/api/4/story/#{para}/short-comments", // 新闻对应短评论
    "recommenders" : "http://news-at.zhihu.com/api/4/story/#{para}/recommenders", // 新闻的推荐者
    "before_section": "http://news-at.zhihu.com/api/4/section/#{id}/before/#{para}",
    "before_theme": "http://news-at.zhihu.com/api/4/theme/#{id}/before/#{para}",
    "long_comments_list": "http://news-at.zhihu.com/api/4/story/#{para}/long-comments", // 长评论信息
    "long_comments_list_m": "http://news-at.zhihu.com/api/4/story/#{para}/long-comments/before/#{id}", // #{id} 最后一天评论信息 id
    "short_comments_list": "http://news-at.zhihu.com/api/4/story/#{para}/short-comments",
    "short_comments_list_m": "http://news-at.zhihu.com/api/4/story/#{para}/short-comments/before/#{id}"
}

var ZhihuDailyData = {
    AJAX_GET_TIME_OUT: 5000, // ajax 请求过期时间
    /**
     * 获取 '过往消息' 消息信息, 这个方法将调整 api 中获取的是上一天消息的问题
     * @param  {[type]} date 当前日期
     */
    getBeforeNewsObj: function(date) {
        return this.ajaxGet(this.getAPIURL(APIs['before'], DateTools.getNextDateStr(date).replace(/-/g, '')));
    },
    getNewsObj: function(id) {
        return this.ajaxGet(this.getAPIURL(APIs['news'], id));
    },
    getCommentsObj: function(id) {
        return this.ajaxGet(this.getAPIURL(APIs['story-extra'], id));
    },
    getSectionObj: function(id) {
        return this.ajaxGet(this.getAPIURL(APIs['section'], id));
    },
    getThemeObj: function(id) {
        return this.ajaxGet(this.getAPIURL(APIs['theme'], id));
    },
    getBeforeSectionObj: function(id, timestamp) {
        if(!this.checkParams(id, timestamp)) {
            return {};
        }
        return this.ajaxGet(this.getAPIURL(APIs['before_section'], timestamp).replace('#{id}', id));
    },
    getBeforeThemeObj: function(id, timestamp) {
        if(!this.checkParams(id, timestamp)) {
            return {};
        }
        return this.ajaxGet(this.getAPIURL(APIs['before_theme'], timestamp).replace('#{id}', id));
    },
    getLatestNewsObj: function() {
        return this.ajaxGet(APIs.latest);
    },
    getHotNewsObj: function() {
        return this.ajaxGet(APIs.hot);
    },
    getThemesObj: function() {
        return this.ajaxGet(APIs.themes);
    },
    getSectionsObj: function() {
        return this.ajaxGet(APIs.sections);
    },
    getLongCommentsList: function(id, lastId) {
        if(lastId) { // 如果传入最后一个 id 则为加载更多
            return this.ajaxGet(this.getAPIURL(APIs['long_comments_list_m'], id).replace('#{id}', lastId));
        }else {
            return this.ajaxGet(this.getAPIURL(APIs['long_comments_list'], id));
        }
    },
    getShortCommentsList: function(id, lastId) {
        if(lastId) { // 如果传入最后一个 id 则为加载更多
            return this.ajaxGet(this.getAPIURL(APIs['short_comments_list_m'], id).replace('#{id}', lastId));
        }else {
            return this.ajaxGet(this.getAPIURL(APIs['short_comments_list'], id));
        }
    },
    checkParams: function() {
        arguments = Array.prototype.slice.call(arguments);
        for (var i = 0, len = arguments.length; i < len; i++) {
            if(typeof arguments[i] === 'undefined') {
                return false;
            }
        }
        return true;
    },
    /**
     * ajax get 同步获取信息
     */
    ajaxGet: function(url) {
        var rs = {};

        // 判断是否启动网络
        if(!window.navigator.onLine) {
            BBUtil.showConnectionDialog();
            ZhihuDaily.removeLoading();
            return rs;
        }

        $.ajax({
            async: false,
            type: 'GET',
            url: url,
            dataType: 'json',
            timeout: this.AJAX_GET_TIME_OUT,
            success: function(data) {
                console.log(url, 'success');
                rs = data;
            },
            error: function(xhr, type) {
                console.log(url, xhr, type, 'error');
                // 如果失败则移除 loading
                ZhihuDaily.removeLoading();
            }
        });
        return rs;
    },
    /**
     * 替换 api 中 #{para} 参数
     */
    getAPIURL: function(api, para) {
        return api.replace('#{para}', para);
    }
}

var ZhihuDaily = {
    isReading: false, // 是否正在读取数据
    DATE_SUFFIX: " 06:59:58", // api 日期中固定时间
    IS_SHOW_LOADING: true, // 是否显示 loading 提示
    LOADING_RES_HEIGHT: 0, // loading 距离底部位置多少时开始加载, 单位 px
    /**
     * 获取开始时间时间戳, 用于 api 中时间戳参数
     * @param  {[string]} date 日期, 格式 2016-11-06
     */
    getStartTimeTSP: function(date) {
        return +new Date(date + this.DATE_SUFFIX);
    },
    /**
     * 加入消息至主页页面
     * @param  {[type]} date 显示日期 xxxx-xx-xx
     */
    appendNews2Stories: function(storiesObj, date, type) {
        if(!storiesObj) {
            return;
        }

        date = date || DateTools.getCurrentDateStr();

        var storiesListDom = $('<ul/>').addClass('stories_list').attr('data-date', date).append($('<div class="stories_date">' + date + '</div>'));
        var liTpl = '<li>' +
            '   <a href="javascript: void(0);">' +
            '       <div class="stories_desc"></div>' +
            '       <div class="stories_ico"></div>' +
            '   </a>' +
            '</li>';
        var item, tempLi, len = storiesObj.length;

        if('hots' === type) {
            for (var i = 0; i < len; i++) {
                item = storiesObj[i];
                tempLi = $(liTpl);
                tempLi.find('a').attr('data-id', item.news_id);
                tempLi.find('.stories_desc').text(item.title);
                tempLi.find('.stories_ico').css({
                    background: 'url(' + item.thumbnail + ')'
                });
                storiesListDom.append(tempLi);
            }
        }
        else if('sections' === type || 'themes' === type) {
            var isThemes = 'themes' === type;
            var stories = storiesObj.stories;
            storiesListDom.attr('data-date', isThemes ? stories[stories.length - 1].id : storiesObj.timestamp);

            if(!stories || !stories.length) {
                if(!$(document.querySelector('.stories_list:last-child')).attr('data-date')) {
                    return;
                }
                storiesListDom.find('.stories_date').text('已加载全部消息...');
            }else {
                len = stories.length;
                for (var i = 0; i < len; i++) {
                    item = stories[i];
                    tempLi = $(liTpl);
                    tempLi.find('a').attr('data-id', item.id);
                    tempLi.find('.stories_desc').text((isThemes ? '' : (item.display_date + '，')) + item.title);
                    if(item.images && item.images[0]) {
                        tempLi.find('.stories_ico').css({
                            background: 'url(' + item.images[0] + ')'
                        });
                    }
                    storiesListDom.append(tempLi);
                }
            }
        }
        else {
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
        }

        $('.stories').append(storiesListDom);

        bb.refresh();
    },
    /**
     * 主页下滑获取前一天数据并显示
     * @param  {[type]} crtDate 当前日期 xxxx-xx-xx
     */
    appendPreDayNews: function(crtDate) {
        this.showLoading();
        this.isReading = true;

        var preDate = DateTools.getPreDateStr(crtDate);
        this.appendNews2Stories(ZhihuDailyData.getBeforeNewsObj(preDate).stories, preDate);

        this.isReading = false;
        this.removeLoading();
    },
    /**
     * 初始化最新消息列表
     */
    initLatestPage: function() {
        this.showLoading();
        var newsObj = ZhihuDailyData.getLatestNewsObj();

        // top 消息填充
        var topNewsObj = newsObj.top_stories, topNewsLen = topNewsObj.length;
        var liTpl = '<li>' +
            '    <a href="javascript:void(0);"><p></p></a>' +
            '</li>',
            aTpl = '<a href="javascript:void(0);"></a>',
            imgSliderTpl = $('<div><ul></ul><div></div></div>').attr('id', 'img_slider');

        for (var i = 0; i < topNewsLen; i++) {
            var item = topNewsObj[i],
                li = $(liTpl),
                a = $(aTpl);

            if(i === 0) {
                li.addClass('active');
                a.addClass('active');
            }
            li.css({
                background: 'url(' + item.image + ')'
            })
            .find('a').attr('data-id', item.id)
            .find('p').text(item.title);

            imgSliderTpl.find('ul').append(li);
            imgSliderTpl.find('div').append(a);
        }
        $('.stories').prepend(imgSliderTpl);
        ImgSlider.init();

        this.appendNews2Stories(newsObj.stories);
        // 用于判断滚动位置
        $('.stories').parent().parent().addClass('stories_box');
        // 判断最新消息时候可以触发滚动事件, 如果不可以多加载一天消息
        window.setTimeout(function() {
            if(this.isStoriesKeepLoading()) {
                this.appendPreDayNews($(document.querySelector('.stories_list:last-child')).attr('data-date'));
            }
        }.bind(this), 200);

        this.removeLoading();
    },
    initHotsPage: function() {
        this.showLoading();

        this.appendNews2Stories(ZhihuDailyData.getHotNewsObj().recent, '今日热门', 'hots');

        this.removeLoading();
    },
    initSectionsPage: function() {
        this.initSectionsOrThemesPage('sections');
    },
    initThemesPage: function() {
        this.initSectionsOrThemesPage('themes');
    },
    initSectionsThemesListPage: function(obj) {
        this.showLoading();
        this.isReading = true;

        var params = obj.params,
            type = params['data-type'],
            id = params['data-id'],
            rs = 'sections' === type ? ZhihuDailyData.getSectionObj(id) : ZhihuDailyData.getThemeObj(id),
            stories = $('.stories');

        stories.attr('data-type', type);
        stories.attr('data-id', id);

        // 如果是主题这需要再上方添加图片和编辑
        if('themes' === type) {
            var infoDoms = $('<div class="content_head_img" style="background: url(' + rs.background + ')">' +
                '    <div class="img_source">来源: ' + rs.image_source + '</div>' +
                '    <div class="img_description">' + rs.description + '</div>' +
                '</div>' +
                '<div class="stories_editors">' +
                '    <ul></ul>' +
                '</div>');
            var ul = infoDoms.find('.stories_editors ul'), item;
            for (var i = 0, len = rs.editors.length; i < len; i++) {
                item = rs.editors[i];
                // item.bio 简介
                ul.append($('<li><a target="_blank" href="' + (item.url || 'javascript:void(0);') + '"><img src="' + item.avatar + '"><p>' + (item.name || 'item.bio') + '</p></a></li>'));
            }
            stories.prepend(infoDoms)
        }

        this.appendNews2Stories(rs, rs.name, type);
        // 用于判断滚动位置
        stories.parent().parent().addClass('stories_box');
        // 判断最新消息时候可以触发滚动事件, 如果不可以多加载一天消息
        window.setTimeout(function() {
            if(this.isStoriesKeepLoading()) {
                this.appendNextSectionsThemes($(document.querySelector('.stories_list:last-child')).attr('data-date'), id, type);
            }
        }.bind(this), 200);

        this.isReading = false;
        this.removeLoading();
    },
    appendNextSectionsThemes: function(timestamp, id, type) {
        this.showLoading();
        this.isReading = true;

        var rs = 'sections' === type ? ZhihuDailyData.getBeforeSectionObj(id, timestamp) : ZhihuDailyData.getBeforeThemeObj(id, timestamp);
        this.appendNews2Stories(rs, rs.name || $(document.querySelector('.stories_list .stories_date')).text(), type);

        this.isReading = false;
        this.removeLoading();
    },
    /**
     * 初始化栏目或者主题总览
     * @type {[string]} sections 栏目总览, themes 主题总览
     */
    initSectionsOrThemesPage: function(type) {
        this.showLoading();

        var ulDom = $('<ul/>').addClass('sections_themes_list');
        var liTpl = '<li>' +
            '    <a href="javascript: void(0);">' +
            '        <p></p>' +
            '        <div></div>' +
            '    </a>' +
            '</li>';
        var rs = null;
        if('themes' === type) {
            rs = ZhihuDailyData.getThemesObj().others;
        }else {
            rs = ZhihuDailyData.getSectionsObj().data;
        }
        if(!rs) {
            return;
        }

        var item, tempLi, len = rs.length;
        for (var i = 0; i < len; i++) {
            item = rs[i];
            tempLi = $(liTpl);

            tempLi.find('a').attr('data-id', item.id).css({
                background: 'url(' + item.thumbnail + ')'
            });
            tempLi.find('a p').text(item.name);
            tempLi.find('a div').text(item.description === '' ? item.name : item.description);

            ulDom.append(tempLi);
        }
        $('.sections_themes').append(ulDom).attr('data-type', type);

        bb.refresh();
        this.removeLoading();
    },
    isStoriesKeepLoading: function() {
        return $('.stories').height() + this.LOADING_RES_HEIGHT <= $('.stories_box').height();
    },
    onStoriesScreenScroll: function() {
        var boxH = App.BB_SCREEN_HEIGHT - bb.screen.getActionBarHeight();
        var topH = $('.stories_box').scrollTop();
        var contentH = $('.stories').height();
        if(!this.isReading && boxH + topH + this.LOADING_RES_HEIGHT >= contentH) {
            var dataType = $('.stories').attr('data-type');
            if(dataType === 'sections' || dataType === 'themes') {
                this.appendNextSectionsThemes($(document.querySelector('.stories_list:last-child')).attr('data-date'), $('.stories').attr('data-id'), dataType);
            }else {
                this.appendPreDayNews($(document.querySelector('.stories_list:last-child')).attr('data-date'));
            }
        }
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
    },
    /**
     * 查看内容
     */
    viewNews: function(id) {
        this.addMask();

        var data = ZhihuDailyData.getNewsObj(id);
        var commentsdata = ZhihuDailyData.getCommentsObj(id);
        var cssLen = data.css.length, jsLen = data.js.length;

        if(cssLen > 0) {
            for (var i = 0; i < cssLen; i++) {
                $('.mask').prepend($('<link rel="stylesheet" type="text/css" href="' + data.css[i] + '" />'));
            }
        }
        if(jsLen > 0) {
            for (var i = 0; i < jsLen; i++) {
                $('.mask').prepend($('<script type="text/javascript" src="' + data.js[i] + '"></script>'));
            }
        }

        var imgTpl = '<div class="content_head_img">' +
                '    <div class="img_source">来源: ' + data.image_source + '</div>' +
                '    <div class="comments_info" data-id="' + id + '">' +
                '        <div>' +
                '            <img src="img/stories_popularity.png">' +
                '            <span>点赞数: ' + commentsdata.popularity + '</span>' +
                '        </div>' +
                '        <div>' +
                '            <img src="img/stories_long_commets.png">' +
                '            <span>长评数: ' + commentsdata.long_comments + '</span>' +
                '        </div>' +
                '        <div>' +
                '            <img src="img/stories_short_commets.png">' +
                '            <span>短评数: ' + commentsdata.short_comments + '</span>' +
                '        </div>' +
                '    </div>' +
                '</div>';

        var bodyHtml = data.body;
        var cb = $('.mask .content_box');

        if(!bodyHtml) {
            if(data.share_url) {
                cb.html($('<a class="open_url" target="_blank" href="' + data.share_url + '">' +
                    '    <div>进入</div>' +
                    '</a>'));
            }else {
                $('.mask .title').html('无法查看此类型文章内容, 待更新...');
                return;
            }
        }else {
            cb.html(data.body);
        }

        if(data.image) {
            cb.prepend($(imgTpl).css({
                background: 'url(' + data.image + ')'
            }));
        }else {
            cb.prepend($('<div></div>').css({
                height: '200px',
                position: 'relative'
            })
            .append($(imgTpl).find('.comments_info').css({
                bottom: 0,
                top: '20px'
            })));
        }

        $('.mask .title').html(data.title);

        this.link2Blank();
    },
    appendCommentsFrame: function() {
        // 按钮
        $('.comments_mask .title').append($('<div class="show_short_comments_btn show_comments_btn active">短评论</div>' +
            '<div class="show_long_comments_btn show_comments_btn">长评论</div>'));
        // 长短评论 box
        $('.comments_mask .content_box').append($('<div class="comments_info_box" id="comments_info_box_short"><ul></ul></div>' +
            '<div class="comments_info_box" id="comments_info_box_long"><ul></ul></div>'));
    },
    changeCommentsType: function(crt) {
        $('.show_comments_btn').removeClass('active');
        crt.addClass('active');

        var sBox = $('#comments_info_box_short'),
            lBox = $('#comments_info_box_long'),
            crtBox = null,
            isLongComments = false;
        if(crt.hasClass('show_long_comments_btn')) {
            isLongComments = true;
            sBox.hide();
            lBox.show();
            crtBox = lBox;
        }else {
            lBox.hide();
            sBox.show();
            crtBox = sBox;
        }
        // 判断是否已经初始化
        if(!crtBox.attr('data-init')) {
            this.viewComments($('.comments_mask .content_box').attr('data-id'), false, isLongComments);
        }
    },
    loadMoreComments: function(crt) {
        var boxH = App.BB_SCREEN_HEIGHT;
        var topH = crt.scrollTop();
        var contentH = crt.find('ul').height();
        // console.log('boxH', boxH, 'topH', topH, 'contentH', contentH);
        // console.log('boxH + topH + this.LOADING_RES_HEIGHT >= contentH', boxH + topH + this.LOADING_RES_HEIGHT >= contentH);
        if(!this.isReading && boxH + topH + this.LOADING_RES_HEIGHT >= contentH) {
            this.viewComments($('.comments_mask .content_box').attr('data-id'),
                crt.find('ul li:last-child').attr('data-id'),
                crt.attr('id') === 'comments_info_box_long');
        }
    },
    /**
     * 查看评论内容
     */
    viewComments: function(id, lastId, isLongComments) {
        if(!id) {
            return;
        }
        var rs = null;
        this.isReading = true;
        this.showLoading();

        // 默认获取短评论
        if(isLongComments) {
            rs = ZhihuDailyData.getLongCommentsList(id, lastId);
        }else {
            rs = ZhihuDailyData.getShortCommentsList(id, lastId);
        }

        var comments = rs.comments;
        var commentsInfoBoxUl = null;
        if(!comments.length) {
            this.isReading = false;
            this.removeLoading();
            return;
        }

        if(isLongComments) {
            commentsInfoBoxUl = $('#comments_info_box_long ul');
        }else {
            commentsInfoBoxUl = $('#comments_info_box_short ul');
        }

        var item = null, replyTo, tsmp, lisHTML = '';
        for (var i = 0, len = comments.length; i < len; i++) {
            item = comments[i];
            replyTo = item.reply_to ? ('<div class="comments_r_info_content"><span>//' + item.reply_to.author + ': </span>' + item.reply_to.content + '</div>') : '';
            tsmp = item.time < 10000000000 ? (item.time * 1000) : item.time;
            lisHTML += '<li data-id="' + item.id + '">' +
                '    <div class="comments_info_avatar"><img src="' + item.avatar + '"></div>' +
                '    <div class="comments_info_desc">' +
                '        <div class="comments_info_author">' + item.author + '<span class="comments_info_content_liks">' + item.likes + '</span></div>' +
                '        <div class="comments_info_content">' + item.content + '</div>' + replyTo +
                '        <div class="comments_info_time">' + DateTools.getTime(new Date(tsmp)) + '</div>' +
                '    </div>' +
                '</li>';
        }
        commentsInfoBoxUl.append($(lisHTML)).parent().attr('data-init', '1').parent().attr('data-id', id);

        this.removeLoading();
        this.isReading = false;
    },
    /**
     * 在当前 screen 中加入弹出层
     */
    addMask: function(clazz) {
        $(bb.screen.currentScreen).append($('<div class="mask ' + (typeof clazz === 'undefined' ? '' : clazz) + '">' +
            '    <div class="head">' +
            '        <div class="title"></div>' +
            '        <button class="close_btn">X</button>' +
            '    </div>' +
            '    <div class="content_box"></div>' +
            '</div>'));

        $('.mask:last-child').fadeIn();
    },
    link2Blank: function() {
        $('.content_box a').attr('target', '_blank');
    }
}

var ActionBarMgr = {
    runing: false,
    ACTION_BAR_CLICK_ITV: 200, // action bar 点击触发时间间隔
    aTrigger: function(e) {
        var id = typeof e === 'string' ? e : $(e).attr('id');
        if(!this.runing) {
            switch (id) {
                case 'action_bar_sections':
                    ShowScreen.sections();
                    break;
                case 'action_bar_themes':
                    ShowScreen.themes();
                    break;
                case 'action_bar_home':
                    ShowScreen.latest();
                    break;
                case 'action_bar_hots':
                    ShowScreen.hots();
                    break;
                default:
                    break;
            }
            this.rundingEnd();
        }
    },
    rundingEnd: function() {
        window.setTimeout(function() {
            this.runing = false;
        }.bind(this), this.ACTION_BAR_CLICK_ITV);
    }
}

var ShowScreen = {
    sections: function() {
        ActionBarMgr.runing = true;
        bb.pushScreen('sections_themes.html', 'sections');
    },
    themes: function() {
        ActionBarMgr.runing = true;
        bb.pushScreen('sections_themes.html', 'themes');
    },
    latest: function() {
        ActionBarMgr.runing = true;
        bb.pushScreen('app.html', 'latest');
    },
    hots: function() {
        ActionBarMgr.runing = true;
        bb.pushScreen('app.html', 'hots');
    },
    sections_themes_list: function(params) {
        ActionBarMgr.runing = true;
        bb.pushScreen('app.html', 'sections_themes_list', params);
    }
}

var BBUtil = {
    showConnectionDialog: function() {
        function dialogCallBack(selection) {
            // TODO
        }

        blackberry.ui.dialog.standardAskAsync("无法连接网络 请检查您的数据连接并重试",
            blackberry.ui.dialog.D_OK,
            dialogCallBack,
            {
                title : "Network Connection Required"
            }
        );
    },
    initImgZoom: function(url) {
        $(bb.screen.currentScreen).append($('<div id="view_img_box"><img src="' + url + '"></div>')
            .on('click', function() {
                $(this).remove();
        }));
    }
}

var ImgSlider = {
    ITV_NAME: "zhihudailyITV",
    ITV_TIME: 10000, // 滚动间隔时间
    params: {
        startX: 0,
        startMarginL: 0,
        sliderUl: null,
        sliderLi: null,
        sliderA: null,
        sliding: false,
        isMove: false
    },
    init: function() {
        this.stop();

        this.params.sliderUl = $('#img_slider ul');
        this.params.sliderLi = $('#img_slider ul li');
        this.params.sliderA = $('#img_slider div a');

        var len = this.params.sliderLi.length;

        this.params.sliderUl.css({
            width: (100 * len) + '%'
        });
        this.params.sliderLi.css({
            width: (100 / len) + '%'
        });

        this.addLisnter();
        this.start();
    },
    start: function() {
        window[this.ITV_NAME] = window.setInterval(function() {
            if(0 === this.slide(1)) {
                this.slide(null, '0');
            }
        }.bind(this), this.ITV_TIME);
    },
    stop: function() {
        window.clearInterval(window[this.ITV_NAME]);
    },
    addLisnter: function() {
        var thiz = this;
        $('#img_slider a').on('swipeLeft swipeRight', function(e) {
            thiz.slide(e.type === 'swipeLeft' ? 1 : 2);
        })
        .on('touchstart', function(e) {
            thiz.stop();

            thiz.params.startX = e.touches[0].pageX;
            thiz.params.startMarginL = window.getComputedStyle(thiz.params.sliderUl[0], null).marginLeft;
            thiz.params.isMove = false;
        }).on('touchend', function(e) {
            thiz.start();

            if(!thiz.params.isMove && !thiz.params.sliding) {
                thiz.params.sliding = true;
                thiz.params.sliderUl.animate({
                    marginLeft: thiz.params.startMarginL
                }, 'linear', function() {
                    thiz.params.sliding = false;
                });
            }
        }).on('touchmove', function(e) {
            if(!thiz.params.sliding) {
                thiz.params.sliderUl.css({
                    marginLeft: Number(thiz.params.startMarginL.replace('px', '')) + (e.touches[0].pageX - thiz.params.startX)
                });
            }
        });
    },
    /**
     * 翻动
     * @param dir 1: next, 2: pre
     * @nextIndex 要翻动到的位置
     * @return 0: 极限位置
     */
    slide: function(dir, nextIndex) {
        var index = this.params.sliderUl.find('li.active').index();
        nextIndex = nextIndex || (dir === 1 ? index + 1 : index - 1);

        if(nextIndex < 0 || nextIndex > this.params.sliderLi.length - 1) {
            this.params.isMove = false;
            if(this.params.sliderUl.sliding) {
                return;
            }
            return 0;
        }

        this.params.sliderUl.sliding = true;
        this.params.sliderUl.animate({
            marginLeft: (nextIndex * -100) + '%'
        }, 'linear', function() {
            this.params.sliderUl.sliding = false;
        }.bind(this));
        this.params.sliderLi.removeClass('active');
        this.params.sliderLi.eq(nextIndex).addClass('active');
        this.params.sliderA.removeClass('active');
        this.params.sliderA.eq(nextIndex).addClass('active');

        this.params.isMove = true;
    }
};