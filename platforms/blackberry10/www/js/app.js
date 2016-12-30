var App = {
    BB_SCREEN_HEIGHT: 0,
    initApp: function() {
        ShowScreen.latest();
        this.attachEvent();
        KeyboardHelper.attachEvent();
    },
    attachEvent: function() {
        $(document).on('bb_ondomready', function(e, obj) {
            BBUtil.setScreenFlag(obj.id);
            App.clearOldScreen();
            App.BB_SCREEN_HEIGHT = $('.bb-screen').height();

            switch (obj.id) {
                case 'latest':
                    ZhihuDaily.initPage.initLatestPage();
                    ZhihuDaily.storieListener.onStoriesBoxScroll();
                    break;
                case 'sections':
                    ZhihuDaily.initPage.initSectionsPage();
                    break;
                case 'themes':
                    ZhihuDaily.initPage.initThemesPage();
                    break;
                case 'hots':
                    ZhihuDaily.initPage.initHotsPage();
                    break;
                case 'sections_themes_list':
                    ZhihuDaily.initPage.initSectionsThemesListPage(obj);
                    ZhihuDaily.storieListener.onStoriesBoxScroll();
                    break;
                case 'change_date':
                    BBUtil.setScreenFlag(obj.params['screenFlag']); // data-screen-flag 重置
                    ZhihuDaily.changeDate.viewHisInfo(obj);
                    break;
                default:
                    break;
            }

            App.clearActionBar(obj.id);
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
            ZhihuDaily.viewer.viewNews($(e.currentTarget).attr('data-id'));
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
            // 默认为长评论, 设置类型
            ZhihuDaily.isLongComments = false;

            ZhihuDaily.mask.addMask('comments_mask');
            ZhihuDaily.mask.addCommentsFrameToMask();
            ZhihuDaily.viewer.viewComments($(e.currentTarget).attr('data-id'));

            ZhihuDaily.storieListener.onCommentsListener();
        });
    },
    clearOldScreen: function() {
        var bbScreen = $('.bb-screen'),
            sLen = bbScreen.length;

        if(sLen > 1) {
            for (var i = 0; i < sLen - 1; i++) {
                console.log(bbScreen.eq(i).parent().attr('id'), 'remove...')
                bbScreen.eq(i).parent().remove();
            }
        }

        bb.screens = bb.screens.slice(-1);
    },
    clearActionBar: function(id) {
        var dateActionBar = document.getElementById('action_bar_date');
        if(!dateActionBar) {
            return;
        }

        // 只有栏目,主页,历史消息页可以查看历史消息, 否则隐藏日期 actionBar
        if(id === 'latest' || id === 'change_date' || $('.stories').attr('data-type') === 'sections') {
            dateActionBar.show();
        }else {
            dateActionBar.hide();
        }
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
    },
    getMaxDay: function(y, m) {
        return new Date(y, m, 0).getDate();
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
};

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
            ZhihuDaily.loading.removeLoading();
            return rs;
        }

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
                console.log(url, xhr, type, 'error');
                ZhihuDaily.loading.removeLoading();
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
};

var ZhihuDaily = {
    isLongComments: false, // 当前浏览的短评类型
    isReading: false, // 是否正在读取数据
    DATE_SUFFIX: " 06:59:58", // api 日期中固定时间
    LOADING_RES_HEIGHT: 50, // loading 距离底部位置多少时开始加载, 单位 px
    /**
     * 初始化界面
     * 1. initLatestPage 最新消息
     * 2. initHotsPage 热门消息
     * 3. initSectionsPage 栏目显示
     * 4. initThemesPage 主题显示
     * 5. initSectionsOrThemesPage 栏目/主题 显示
     * 6. initSectionsThemesListPage 栏目/主题 列表消息
     */
    initPage: {
        initLatestPage: function() {
            ZhihuDaily.loading.showLoading();

            var newsObj = ZhihuDailyData.getLatestNewsObj();
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

            ZhihuDaily.appendMore.appendNews2Stories(newsObj.stories);
            // 用于判断滚动位置
            BBUtil.addStoriesBoxClass();
            // 判断最新消息时候可以触发滚动事件, 如果不可以多加载一天消息
            window.setTimeout(function() {
                if(BBUtil.isStoriesKeepLoading()) {
                    ZhihuDaily.appendMore.appendPreDayNews($(document.querySelector('.stories_list:last-child')).attr('data-date'));
                }
            }, 200);

            ZhihuDaily.loading.removeLoading();
        },
        initHotsPage: function() {
            ZhihuDaily.loading.showLoading();
            ZhihuDaily.appendMore.appendNews2Stories(ZhihuDailyData.getHotNewsObj().recent, '今日热门', 'hots');
            BBUtil.addStoriesBoxClass();
            ZhihuDaily.loading.removeLoading();
        },
        initSectionsPage: function() {
            this.initSectionsOrThemesPage('sections');
        },
        initThemesPage: function() {
            this.initSectionsOrThemesPage('themes');
        },
        initSectionsThemesListPage: function(obj) {
            ZhihuDaily.loading.showLoading();
            ZhihuDaily.isReading = true;

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

            ZhihuDaily.appendMore.appendNews2Stories(rs, rs.name, type);
            // 用于判断滚动位置
            BBUtil.addStoriesBoxClass();
            // 判断最新消息时候可以触发滚动事件, 如果不可以多加载一天消息
            window.setTimeout(function() {
                if(BBUtil.isStoriesKeepLoading()) {
                    ZhihuDaily.appendMore.appendNextSectionsThemes($(document.querySelector('.stories_list:last-child')).attr('data-date'), id, type);
                }
            }, 200);

            ZhihuDaily.isReading = false;
            ZhihuDaily.loading.removeLoading();
        },
        initSectionsOrThemesPage: function(type) {
            ZhihuDaily.loading.showLoading();

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

            ZhihuDaily.loading.removeLoading();
        },
    },
    /**
     * 加载更多
     * 1. appendNews2Stories 加载新闻到主页
     * 2. appendPreDayNews 加载下一天的新闻到列表
     * 3. appendNextSectionsThemes 加载更多 栏目/主题 新闻到列表
     * 4. appendMoreComments 加载更多评论, 包括长短评论
     */
    appendMore: {
        appendNews2Stories: function(storiesObj, date, type) {
            if(!storiesObj) {
                return;
            }

            date = date || DateTools.getCurrentDateStr();

            var storiesListDom = $('<ul/>').addClass('stories_list').attr('data-date', date).append($('<div class="stories_date">' + date + '</div>'));
            var liTpl = '<li>' +
                '   <a href="javascript:void(0);">' +
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
                        tempLi.find('.stories_desc').text((isThemes ? '' : (item.date + '，')) + item.title);
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
        },
        appendPreDayNews: function(crtDate) {
            ZhihuDaily.loading.showLoading();
            ZhihuDaily.isReading = true;

            var preDate = DateTools.getPreDateStr(crtDate);
            this.appendNews2Stories(ZhihuDailyData.getBeforeNewsObj(preDate).stories, preDate);

            ZhihuDaily.isReading = false;
            ZhihuDaily.loading.removeLoading();
        },
        appendNextSectionsThemes: function(timestamp, id, type) {
            ZhihuDaily.loading.showLoading();
            ZhihuDaily.isReading = true;

            var rs = 'sections' === type ? ZhihuDailyData.getBeforeSectionObj(id, timestamp) : ZhihuDailyData.getBeforeThemeObj(id, timestamp);
            this.appendNews2Stories(rs, rs.name || $(document.querySelector('.stories_list .stories_date')).text(), type);

            ZhihuDaily.isReading = false;
            ZhihuDaily.loading.removeLoading();
        },
        appendMoreComments: function(crt) {
            var boxH = App.BB_SCREEN_HEIGHT;
            var topH = $('.comments_mask .content_box_wrapper').scrollTop();
            var ul = crt.find('ul');
            var contentH = ul.height();

            if(!ZhihuDaily.isReading && boxH + topH + ZhihuDaily.LOADING_RES_HEIGHT >= contentH && !ul.attr('is_load_end')) {
                ZhihuDaily.viewer.viewComments($('.comments_mask .content_box').attr('data-id'),
                    crt.find('ul li:last-child').attr('data-id'),
                    crt.attr('id') === 'comments_info_box_long');
            }
        }
    },
    /**
     * 查看内容
     * 1. viewNews 查看新闻内容
     * 2. viewComments 查看评论内容
     */
    viewer: {
        viewNews: function(id) {
            ZhihuDaily.loading.showLoading();
            ZhihuDaily.mask.addMask();

            var data = ZhihuDailyData.getNewsObj(id);
            var commentsdata = ZhihuDailyData.getCommentsObj(id);
            var cssLen = data.css.length, jsLen = data.js.length;
            var lastCssIdIndex = 0, haveCss = false;

            if(cssLen > 0) {
                haveCss = true;
                for (var i = 0; i < cssLen; i++) {
                    $('.mask').prepend($('<link rel="stylesheet" type="text/css" id="view_news_' + i + '" href="' + data.css[i] + '" />'));
                    lastCssIdIndex = i;
                }
            }
            if(jsLen > 0) {
                for (var i = 0; i < jsLen; i++) {
                    $('.mask').prepend($('<script type="text/javascript" src="' + data.js[i] + '"></script>'));
                }
            }

            var cb = $('.mask .content_box').css({
                display: 'none'
            });

            // 解决闪烁问题
            if(haveCss) {
                var isLoadCss = false;
                document.querySelector('#view_news_' + lastCssIdIndex).onload = function() {
                    isLoadCss = true;
                    cb.fadeIn();
                }

                window.setTimeout(function() {
                    if(!isLoadCss) {
                        cb.fadeIn();
                    }
                }, 2000);
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

            if(!bodyHtml) {
                if(data.share_url) {
                    cb.append($('<a class="open_url" target="_blank" href="' + data.share_url + '">' +
                        '    <div>进入</div>' +
                        '</a>'));
                }else {
                    $('.mask .title').text('无法查看此类型文章内容, 待更新...');
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
                    height: '10rem',
                    position: 'relative'
                })
                .append($(imgTpl).find('.comments_info').css({
                    bottom: 0
                })));
            }

            $('.mask .title').text(data.title);

            BBUtil.link2Blank();
            ZhihuDaily.loading.removeLoading();
        },
        viewComments: function(id, lastId, isLongComments) {
            if(!id) {
                return;
            }
            var rs = null;
            ZhihuDaily.isReading = true;
            ZhihuDaily.loading.showLoading();

            // 默认获取短评论
            if(isLongComments) {
                rs = ZhihuDailyData.getLongCommentsList(id, lastId);
            }else {
                rs = ZhihuDailyData.getShortCommentsList(id, lastId);
            }

            var comments = rs.comments;
            var commentsInfoBoxUl = null;

            if(isLongComments) {
                commentsInfoBoxUl = $('#comments_info_box_long ul');
            }else {
                commentsInfoBoxUl = $('#comments_info_box_short ul');
            }

            commentsInfoBoxUl.parent().attr('data-init', '1');

            if(!comments.length) {
                ZhihuDaily.isReading = false;
                ZhihuDaily.loading.removeLoading();
                // 如果加载完成则加上标志
                commentsInfoBoxUl.append($('<li>' +
                        '   <div class="comments_info_avatar"></div>' +
                        '   <div class="comments_info_desc"><div class="comments_info_author">已经全部加载完成!</div></div>' +
                        '</li>')).attr('is_load_end', 1);
                return;
            }

            var item = null, tsmp, lisHTML = '', replyTo = '';
            for (var i = 0, len = comments.length; i < len; i++) {
                item = comments[i];

                if(item.reply_to) {
                    if(item.reply_to.status === 1) { // 评论已删除
                        replyTo = '<div class="comments_r_info_content"><span></span>' + item.reply_to.error_msg + '</div>'
                    }else {
                        replyTo = '<div class="comments_r_info_content"><span>//' + item.reply_to.author + ': </span>' + item.reply_to.content + '</div>';
                    }
                }

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
            commentsInfoBoxUl.append($(lisHTML)).parent().parent().attr('data-id', id);

            ZhihuDaily.loading.removeLoading();
            ZhihuDaily.isReading = false;
        }
    },
    /**
     * 事件监听器
     * 1. onStoriesBoxScroll 主页滚动滚动监听器
     * 2. onStoriesScreenScrollExer 主页滚动滚动监听执行者
     * 3. onCommentsListener 切换长短评按钮监听, 滚动加载评论监听
     * 4. onChangeCommentsTypeExer 切换长短评按钮监执行者
     */
    storieListener: {
        onStoriesBoxScroll: function() {
            $('.stories_box').on('scroll', function(e) {
                e.preventDefault();
                this.onStoriesScreenScrollExer(e);
            }.bind(this));
        },
        onStoriesScreenScrollExer: function(e) {
            var boxH = App.BB_SCREEN_HEIGHT - bb.screen.getActionBarHeight();
            var topH = $(e.currentTarget).scrollTop();
            var contentH = $('.stories').height();

            if(!ZhihuDaily.isReading && boxH + topH + ZhihuDaily.LOADING_RES_HEIGHT >= contentH) {
                var dataType = $('.stories').attr('data-type');
                if(dataType === 'sections' || dataType === 'themes') {
                    ZhihuDaily.appendMore.appendNextSectionsThemes($(document.querySelector('.stories_list:last-child')).attr('data-date'), $('.stories').attr('data-id'), dataType);
                }else {
                    ZhihuDaily.appendMore.appendPreDayNews($(document.querySelector('.stories_list:last-child')).attr('data-date'));
                }
            }
        },
        onCommentsListener: function() {
            // 监听切换事件
            $('.comments_mask .show_comments_btn').on('click', function(e) {
                var crt = $(e.currentTarget);
                if(!crt.hasClass('active')) {
                    this.onChangeCommentsTypeExer(crt);
                }
            }.bind(this));

            // 滚动加载更多
            $('.comments_mask .content_box_wrapper').on('scroll', function(e) {
                e.preventDefault();
                ZhihuDaily.isLongComments ? ZhihuDaily.appendMore.appendMoreComments($('#comments_info_box_long')) : ZhihuDaily.appendMore.appendMoreComments($('#comments_info_box_short'));
            });
        },
        onChangeCommentsTypeExer: function(crt) {
            $('.show_comments_btn').removeClass('active');
            crt.addClass('active');

            var sBox = $('#comments_info_box_short'),
                lBox = $('#comments_info_box_long'),
                crtBox = null;
            if(crt.hasClass('show_long_comments_btn')) {
                ZhihuDaily.isLongComments = true;
                sBox.hide();
                lBox.show();
                crtBox = lBox;
            }else {
                ZhihuDaily.isLongComments = false;
                lBox.hide();
                sBox.show();
                crtBox = sBox;
            }
            // 判断是否已经初始化
            if(!crtBox.attr('data-init')) {
                ZhihuDaily.viewer.viewComments($('.comments_mask .content_box').attr('data-id'), false, ZhihuDaily.isLongComments);
            }
        }
    },
    /**
     * loading 页面显示与关闭
     * 1. showLoading 显示
     * 2. removeLoading 关闭
     */
    loading: {
        IS_SHOW_LOADING: true,
        showLoading: function() {
            if(this.IS_SHOW_LOADING) {
                // TODO
            }
        },
        removeLoading: function() {
            if(this.IS_SHOW_LOADING) {
                // TODO
            }
        }
    },
    /**
     * 弹出层操作
     * 1. addMask
     * 2. addCommentsFrameToMask
     */
    mask: {
        addMask: function(clazz) {
            $(bb.screen.currentScreen).append($('<div class="mask ' + (typeof clazz === 'undefined' ? '' : clazz) + '">' +
                '    <div class="head">' +
                '        <div class="title"></div>' +
                '        <button class="close_btn">X</button>' +
                '    </div>' +
                '    <div class="content_box_wrapper">' +
                '       <div class="content_box"></div>' +
                '   </div>' +
                '</div>'));

            $('.mask:last-child').fadeIn();
        },
        addCommentsFrameToMask: function() {
            // 按钮
            $('.comments_mask .title').append($('<div class="show_short_comments_btn show_comments_btn active">短评论</div>' +
                '<div class="show_long_comments_btn show_comments_btn">长评论</div>'));
            // 长短评论 box
            $('.comments_mask .content_box').append($('<div class="comments_info_box" id="comments_info_box_short"><ul></ul></div>' +
                '<div class="comments_info_box" id="comments_info_box_long"><ul></ul></div>'));
        }
    },
    /**
     * 选择日期部分
     * 1. initPanel 初始化选择器面板
     * 2. initEvent 注册事件
     * 3. validateDate 验证日期
     * 4. viewHisInfo 调用显示
     */
    changeDate: {
        CLASS_NAME: "change_date_mask",
        DOT_CLASS_NAME: ".change_date_mask",
        initPanel: function() {
            // 添加 Mask 提供显示选择日期
            ZhihuDaily.mask.addMask(this.CLASS_NAME);

            this.initChooser($('.stories').attr('data-current_selected_date'));
            this.initEvent();
        },
        initChooser: function(iDate) {
            var panel = $(this.DOT_CLASS_NAME),
                titleBox = panel.find('.title'),
                contentBox = panel.find('.content_box');

            var date = typeof iDate === 'string' ? new Date(iDate) : new Date(),
                y = date.getFullYear(),
                m = date.getMonth() + 1,
                d = date.getDate(),
                maxDay = DateTools.getMaxDay(y, m);

            var yearSelector = $('<select data-bb-style="stretch" name="year" id="year"></select>'),
                monthSelector = $('<select data-bb-style="stretch" name="month" id="month"></select>'),
                daySelector = $('<select data-bb-style="stretch" name="day" id="day"></select>'),
                btn = $('<input type="button" name="change_date_btn" id="change_date_btn" value="确定">');

            var yearSelectorD = yearSelector.get(0),
                monthSelectorD = monthSelector.get(0),
                daySelectorD = daySelector.get(0),
                temp = 0;

            for (var i = 2013; i <= y; i++) {
                if(i === y) {
                    yearSelector.append($('<option data-bb-accent-text="current" value="' + i + '">' + i + '</option>'));
                }else {
                    yearSelector.append($('<option value="' + i + '">' + i + '</option>'));
                }
            }

            for (var i = 1; i <= 12; i++) {
                temp = i < 10 ? '0' + i : i;
                if(i === m) {
                    monthSelector.append($('<option data-bb-accent-text="current" value="' + temp + '">' + temp + '</option>'));
                }else {
                    monthSelector.append($('<option value="' + temp + '">' + temp + '</option>'));
                }
            }

            for (var i = 1; i <= maxDay; i++) {
                temp = i < 10 ? '0' + i : i;
                if(i === d) {
                    daySelector.append($('<option data-bb-accent-text="current" value="' + temp + '">' + temp + '</option>'));
                }else {
                    daySelector.append($('<option value="' + temp + '">' + temp + '</option>'));
                }
            }

            titleBox.text('请选择日期');

            contentBox.append(bb.dropdown.style(yearSelectorD))
                .append(bb.dropdown.style(monthSelectorD))
                .append(bb.dropdown.style(daySelectorD))
                .append(btn);

            yearSelectorD.setSelectedItem(y - 2013);
            monthSelectorD.setSelectedItem(m - 1);
            daySelectorD.setSelectedItem(d - 1);

            // 默认打开日期选择器
            window.setTimeout(function() {
                // 内核自定最小时间刷新, 解决默认伸展失效问题
                document.getElementById('day').dropdown.internalShow()
            }, 0);
        },
        initEvent: function() {
            var that = this;
            $('#change_date_btn').on('click', function(e) {
                var selectedDate = [$('#year').val(), $('#month').val(), $('#day').val()].join('-');
                var screenFlag = $('.bb-screen').attr('data-screen-flag');
                var stories = $('.stories'),
                    type = stories.attr('data-type'),
                    id = stories.attr('data-id');

                if(!that.validateDate(selectedDate)) {
                    return;
                }

                // 关闭 panel
                $('.close_btn').trigger('click');

                window.setTimeout(function() {
                    ShowScreen.changeDate({
                        screenFlag: screenFlag,
                        date: selectedDate,
                        type: type,
                        id: id,
                    });
                }, 500);
            });

            $('#year, #month').on('change', function(e) {
                var maxDay = DateTools.getMaxDay($('#year').val(), $('#month').val());
                var crtLen = $('#day option').length;
                // 计算天数
                if(maxDay > crtLen) {
                    var addOptions = [];
                    for (var i = crtLen + 1; i <= maxDay; i++) {
                        addOptions.push('<option value="' + i + '">' + i + '</option>');
                    }
                    $('#day').append($(addOptions.join('')));
                }else if(maxDay < crtLen) {
                    for (var i = maxDay; i < crtLen; i++) {
                        $('#day option').eq(i).remove();
                    }
                }

                document.getElementById('day').refresh();
            });
        },
        validateDate: function(date) {
            if(typeof date === 'undefined' || date === '') {
                BBUtil.alert('请选择日期!', '提示');
                return false;
            }
            else if((+new Date(date)) > (+new Date())) {
                BBUtil.alert('选择的日期不能大于当前时间!', '提示');
                return false;
            }
            return true;
        },
        viewHisInfo: function(obj) {
            // 查看类型
            var screenFlag = obj.params['screenFlag'];
            var stories = $('.stories');
            var date = obj.params.date;
            var type = obj.params.type;
            var id = obj.params.id;

            // 设置当前查询的日期, 用于选择回填
            stories.attr('data-current_selected_date', date);

            // 只有栏目和主页可以查看历史消息
            if('sections_themes_list' === screenFlag) { // 栏目/主题
                if('sections' === type) { // 栏目
                    stories.attr('data-type', type);
                    stories.attr('data-id', id);

                    ZhihuDaily.appendMore.appendNextSectionsThemes(+new Date(date) / 1000, id, type);
                }else {
                    this.connotViewThisType();
                    return;
                }
            }else if('latest' === screenFlag) {
                ZhihuDaily.appendMore.appendPreDayNews(DateTools.getNextDateStr(new Date(date)));
            }else {
                this.connotViewThisType();
                return;
            }

            BBUtil.addStoriesBoxClass();
            ZhihuDaily.storieListener.onStoriesBoxScroll();
        },
        connotViewThisType: function() {
            BBUtil.alert('此类型不支持查看历史消息!', '提示');
        }
    }
};

var KeyboardHelper = {
    KEY_CHAR: 'isthdcmw',
    attachEvent: function() {
        var that = this;

        // TypeError: undefined is not an object (evaluating 'bb.actionOverflow.create')
        window.setTimeout(function() {
            blackberry.event.addEventListener("unhandledkeyinput", function (e) {
                if(e.keyDown) {
                    var keycode = String.fromCharCode(e.keycode);
                    if(that.KEY_CHAR.indexOf(keycode) !== -1) {
                        that[keycode]();
                    }
                }
            });
        }, 200);
    },
    i: function() {
        // 主页
        ActionBarMgr.aTrigger('action_bar_home');
    },
    s: function() {
        // 栏目
        ActionBarMgr.aTrigger('action_bar_sections');
    },
    t: function() {
        // 主题
        ActionBarMgr.aTrigger('action_bar_themes');
    },
    h: function() {
        // 热门
        ActionBarMgr.aTrigger('action_bar_hots');
    },
    d: function() {
        // 日期选择
        if(document.getElementById('action_bar_date') 
                && document.getElementById('action_bar_date').style.display !== 'none' 
                && !document.querySelector('.mask')) {
            ActionBarMgr.aTrigger('action_bar_date');
        }
    },
    c: function() {
        // 关闭页面
        var mask = document.querySelector('.mask:last-child');
        if(mask) {
            mask = $(mask);
            mask.fadeOut(function() {
                mask.remove();
            });
        }
    },
    m: function() {
        // 查看评论
        var commentsInfo = document.querySelector('.comments_info');
        if(commentsInfo) {
            $(commentsInfo).trigger('click');
        }
    },
    w: function() {
        // 切换评论
        var btn = document.querySelector('.show_comments_btn:not(.active)');
        if(btn) {
            $(btn).trigger('click');
        }
    }
};

var ActionBarMgr = {
    aTrigger: function(e) {
        switch (typeof e === 'string' ? e : $(e).attr('id')) {
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
            case 'action_bar_date':
                ZhihuDaily.changeDate.initPanel();
                break;
            default:
                break;
        }
    }
};

var ShowScreen = {
    sections: function() {
        bb.pushScreen('sections_themes.html', 'sections');
    },
    themes: function() {
        bb.pushScreen('sections_themes.html', 'themes');
    },
    latest: function() {
        bb.pushScreen('app.html', 'latest');
    },
    hots: function() {
        bb.pushScreen('app.html', 'hots');
    },
    sections_themes_list: function(params) {
        bb.pushScreen('app.html', 'sections_themes_list', params);
    },
    changeDate: function(params) {
        bb.pushScreen('app.html', 'change_date', params);
    }
};

var BBUtil = {
    showConnectionDialog: function() {
        this.alert("无法连接网络 请检查您的数据连接并重试", "Network Connection Required");
    },
    alert: function(content, title) {
        function dialogCallBack(selection) {
            // TODO
        }

        blackberry.ui.dialog.standardAskAsync(content,
            blackberry.ui.dialog.D_OK,
            dialogCallBack,
            {
                title : title
            }
        );
    },
    initImgZoom: function(url) {
        $(bb.screen.currentScreen).append($('<div id="view_img_box"><img src="' + url + '"></div>')
            .on('click', function() {
                $(this).remove();
        }));
    },
    link2Blank: function() {
        $('.content_box a').attr('target', '_blank');
    },
    isStoriesKeepLoading: function() {
        return $('.stories').height() + ZhihuDaily.LOADING_RES_HEIGHT <= $('.stories_box').height();
    },
    setScreenFlag: function(val) {
        $(bb.screen.currentScreen).attr('data-screen-flag', val);
    },
    addStoriesBoxClass: function() {
        $('.stories').parent().parent().addClass('stories_box');
    }
};

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