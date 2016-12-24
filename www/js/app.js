var App = {
    initApp: function() {
        bb.pushScreen('app.html', 'latest');
        this.attachEvent();
    },
    attachEvent: function() {
        $(document).on('bb_ondomready', function(e, paras) {
            switch (paras.id) {
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
}

var ZhihuDailyDate = {
    AJAX_GET_TIME_OUT: 5000, // ajax 请求过期时间
    /**
     * 获取 '过往消息' 消息信息, 这个方法将调整 api 中获取的是上一天消息的问题
     * @param  {[type]} date 当前日期
     */
    getBeforeNewsObj: function(date) {
        return this.ajaxGet(this.getAPIURL(APIs.before, DateTools.getNextDateStr(date).replace(/-/g, '')));
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
    getNewsObj: function(id) {
        return this.ajaxGet(this.getAPIURL(APIs.news, id));
    },
    getCommentsObj: function(id) {
        return this.ajaxGet(this.getAPIURL(APIs['story-extra'], id));
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
                rs = data;
            },
            error: function(xhr, type) {
                console.log(xhr, type);
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
    is_reading: false, // 是否正在读取数据
    DATE_SUFFIX: " 06:59:58", // api 日期中固定时间
    IS_SHOW_LOADING: true, // 是否显示 loading 提示
    LOADING_RES_HEIGHT: 20, // loading 距离底部位置多少时开始加载, 单位 px
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
    appendNews2Stories: function(storiesObj, date) {
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

        if('热门消息' === date) {
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
        }else {
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
        this.is_reading = true;

        var preDate = DateTools.getPreDateStr(crtDate);
        this.appendNews2Stories(ZhihuDailyDate.getBeforeNewsObj(preDate).stories, preDate);

        this.is_reading = false;
        this.removeLoading();
    },
    /**
     * 初始化最新消息列表
     */
    initLatestPage: function() {
        this.showLoading();
        var newsObj = ZhihuDailyDate.getLatestNewsObj();

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

        this.appendNews2Stories(ZhihuDailyDate.getHotNewsObj().recent, '热门消息');

        this.removeLoading();
    },
    initSectionsPage: function() {
        this.initSectionsOrThemesPage('sections');
    },
    initThemesPage: function() {
        this.initSectionsOrThemesPage('themes');
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
            rs = ZhihuDailyDate.getThemesObj().others;
        }else {
            rs = ZhihuDailyDate.getSectionsObj().data;
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
        $('.sections_themes').append(ulDom);

        bb.refresh();
        this.removeLoading();
    },
    isStoriesKeepLoading: function() {
        return $('.stories').height() + this.LOADING_RES_HEIGHT <= $('.stories_box').height();
    },
    onStoriesScreenScroll: function() {
        var boxH = $('.bb-screen').height() - bb.screen.getActionBarHeight();
        var topH = $('.stories_box').scrollTop();
        var contentH = $('.stories').height();
        if(boxH + topH + this.LOADING_RES_HEIGHT >= contentH && !this.is_reading) {
            this.appendPreDayNews($(document.querySelector('.stories_list:last-child')).attr('data-date'));
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

        var data = ZhihuDailyDate.getNewsObj(id);
        var commentsdata = ZhihuDailyDate.getCommentsObj(id);
        var cssLen = data.css.length, jsLen = data.js.length;

        if(data.type !== 0) {
            $('.mask .title').html('无法查看此类型文章内容, 待更新...');
            return;
        }
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
                '    <div class="comments_info">' +
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

        $('.mask .content_box').html(data.body).prepend($(imgTpl).css({
            background: 'url(' + data.image + ')'
        }));
        $('.mask .title').html(data.title);

        this.link2Blank();
    },
    /**
     * 在当前 screen 中加入弹出层
     */
    addMask: function() {
        $(bb.screen.currentScreen).append($('<div class="mask">' +
            '    <div class="head">' +
            '        <div class="title"></div>' +
            '        <button class="close_btn">X</button>' +
            '    </div>' +
            '    <div class="content_box"></div>' +
            '</div>'));

        $('.mask').fadeIn();
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
        $('.mask').append($('<div id="view_img_box"><img src="' + url + '"></div>')
            .on('click', function() {
                $(this).remove();
        }));
    }
}

var ImgSlider = {
    paras: {
        startX: 0,
        startMarginL: 0, 
        sliderUl: $('#img_slider ul'), 
        sliderLi: $('#img_slider ul li'), 
        sliderA: $('#img_slider div a'), 
        sliding: false,
        isMove: false
    },
    init: function() {
        this.addLisnter(this);
    },
    addLisnter: function(thiz) {
        $('#img_slider a').on('swipeLeft swipeRight', function(e) {
            var index = thiz.paras.sliderUl.find('li.active').index();
            var nextIndex = e.type === 'swipeLeft' ? index + 1 : index - 1;

            if(nextIndex < 0 || nextIndex > thiz.paras.sliderLi.length - 1) {
                thiz.paras.isMove = false;
                return;
            }

            thiz.paras.sliderUl.animate({
                marginLeft: (nextIndex * -100) + '%'
            });
            thiz.paras.sliderLi.removeClass('active');
            thiz.paras.sliderLi.eq(nextIndex).addClass('active');
            thiz.paras.sliderA.removeClass('active');
            thiz.paras.sliderA.eq(nextIndex).addClass('active');

            thiz.paras.isMove = true;
        }).on('touchstart', function(e) {
            thiz.paras.startX = e.touches[0].pageX;
            thiz.paras.startMarginL = window.getComputedStyle(thiz.paras.sliderUl[0], null).marginLeft;
            thiz.paras.isMove = false;
        }).on('touchend', function(e) {
            if(!thiz.paras.isMove && !thiz.paras.sliding) {
                thiz.paras.sliding = true;
                thiz.paras.sliderUl.animate({
                    marginLeft: thiz.paras.startMarginL
                }, function() {
                    thiz.paras.sliding = false;
                });
            }
        }).on('touchmove', function(e) {
            if(!thiz.paras.sliding) {
                thiz.paras.sliderUl.animate({
                    marginLeft: Number(thiz.paras.startMarginL.replace('px', '')) + (e.touches[0].pageX - thiz.paras.startX)
                });
            }
        });
    }
};