/**
  * Theme: player
  * Dependence: jQuery
  *
  */

/**
 * dragProgress
 * @param  {object} data {$progressArc,$progressBar,$progressBox,$audio,callback_move,callback_up}
 */
function dragProgress(data) {
	var $progressArc = data.$progressArc,
		$progressBar = data.$progressBar,
		$progressBox = data.$progressBox,
		$audio = data.$audio,
		progressBox_offset = $progressBox.get(0).getBoundingClientRect(),
		changeVal = 0;

	// 鼠标按下
	$progressArc.on("mousedown", function (ev) {
		var ev = ev ? ev : window.event;
		var ex = ev.clientX;
		var arcOffset = $progressArc.get(0).getBoundingClientRect();
		var arcOffset_L = arcOffset.left;
		var disX = ex - arcOffset_L;

		var moveArc = function (ev) {
			// 更新进度条
			var ev = ev ? ev : window.event;
			var ex2 = ev.clientX;
			var disX2 = (((ex2 - progressBox_offset.left - disX) / progressBox_offset.width) * 100).toFixed(2);
			disX2 = disX2 <= 0 ? 0 : (disX2 >= 100 ? 100 : disX2);
			// 判断是否可以播放
			if (!!$audio.attr("src")) {
				$progressBar.css("width", disX2 + "%");
				// 更新
				changeVal = data.callback_move && data.callback_move(disX2);
			}
		};
		var offmouseup = function () {
			$(document).off("mousemove", moveArc);
			$(document).off("mouseup", offmouseup);
			// 判断是否可以播放
			if (!!$audio.attr("src")) {
				// 更新
				data.callback_up && data.callback_up(changeVal);
			}

		};
		// 鼠标移动
		$(document).on("mousemove", moveArc);
		// 鼠标抬起
		$(document).on("mouseup", offmouseup);

	});
}
/**
 * audio error
 * @param {HTMLAudioElement} audio
 * 
 */
function audioError(audio) {
	// 音频数据出错
	// 0 = NETWORK_EMPTY - 音频/视频尚未初始化
	// 1 = NETWORK_IDLE - 音频/视频是活动的且已选取资源，但并未使用网络
	// 2 = NETWORK_LOADING - 浏览器正在下载数据
	// 3 = NETWORK_NO_SOURCE - 未找到音频/视频来源
	switch (+audio.networkState) {
		case 0:
			showTipBox("error", "音频尚未初始化");
			break;
		case 1:
			// showTipBox("error","音频是活动的且已选取资源，但并未使用网络");
			break;
		case 2:
			showTipBox("error", "浏览器正在下载数据");
			break;
		case 3:
			showTipBox("error", "未找到音频来源");
			break;
		default: console.warn("SWITCH ERROR");
			break;
	}
}

$(function () {

	// 设置基本信息
	var curPlayLine = 0, // 当前播放曲目序号
		isDrag = false, // 是否允许拖动进度条
		timer = null, // 缓冲进度定时器timer
		volume = 0.5, // 默认音量
		bufferCache = 0, // 默认缓存进度
		bufferCacheStep = 1e3; // 默认加载缓存的时间间隔

	// DOM
	var media = $("#audio").get(0), // audio
		$playBtnGroup = $("#playBtnGroup"), // 播放按钮组
		$muteBtn = $("#muteBtn"), // 静音按钮
		$bgDisc = $("#bgDisc"), // 歌曲详情页 磁盘
		$discNeedle = $("#discNeedle"), // 歌曲详情页 磁针
		$bgBlur = $("#bgBlur"), // 歌曲详情页bg
		$songDetail = $("#songDetail"), // 歌曲详情页信息
		$smallwindow_songName = $("#smallwindow_songName"), // 小窗歌曲名字
		$smallwindow_singerName = $("#smallwindow_singerName"), // 小窗歌手名字
		$infoList_playlist = $("#infoList_playlist"), // 歌单列表
		$infoList_search = $("#infoList_search"),// 搜索列表
		$trs = $infoList_playlist.find("tr"), // 歌单列表tr
		$curTime = $("#audio_currentTime"), // 当前时间
		$duration = $("#audio_duration"), // 时长
		$time_progressBox = $("#progress_box"), // 进度条父元素
		$time_progressBar = $("#progress_bar"), // 进度条本身
		$time_progressArc = $("#progress_arc"), // 圆点
		$progress_cache = $("#progress_cache"), // 缓冲进度条
		$vol_progressBox = $("#vol_progress_box"), // 进度条父元素
		$vol_progressBar = $("#vol_progress_bar"), // 进度条本身
		$vol_progressArc = $("#vol_progress_arc"); // 圆点

	// ======================播放音乐主函数===============================

	// @param: curPlayIndex[,$trs,_that]
	var playMusic = function () {
		var $trs = null;
		var _this = null;

		// 搜索页面
		if (arguments.length === 2) {
			$trs = arguments[0];
			_this = arguments[1];
		} else { // 歌单页面
			$trs = $infoList_playlist.find("tr");
			_this = $trs.get(arguments[0]);
		}

		// 进度条初始化
		$time_progressBar.css("width", "0%");
		$progress_cache.css("width", "0%");
		// 音频暂停播放
		media.pause();
		// 播放按钮变为暂停样式
		stylePlayBtn($playBtnGroup.find(".play"), "pause");
		// 获取资源
		$(media).attr("src", _this.dataset.audio);
		// 进行播放
		$(media).on("canplay", function () {
			this.play();
		});
		// 播放按钮变为播放样式
		stylePlayBtn($playBtnGroup.find(".play"), "play");
		// 高亮播放所在列
		$trs.find("td.index").each(function (index, item) {
			$(item).html(item.dataset.num).removeClass("active");
		});
		$(_this).find("td.index").html('<i class="fa fa-volume-up" aria-hidden="true"></i>').addClass("active");
		// 刷新小窗专辑封面
		$smallwindow_songName.html(_this.dataset.songName);
		$smallwindow_singerName.html(_this.dataset.singerName);
		// 储存当前歌曲必要信息
		sessionStorage.setItem("curPlayInfo_songName", _this.dataset.songName);
		sessionStorage.setItem("curPlayInfo_singersName", _this.dataset.singerName);
		sessionStorage.setItem("curPlayInfo_albumName", _this.dataset.albumName);
		sessionStorage.setItem("curPlayInfo_audioSrc", _this.dataset.audio);

		// 刷新歌曲详情页bg和poster
		// 刷新歌曲基本信息
		$songDetail.find(".songname").html(sessionStorage.getItem('curPlayInfo_songName'));
		$songDetail.find(".albumname").html(sessionStorage.getItem('curPlayInfo_singersName'));
		$songDetail.find(".singersname").html(sessionStorage.getItem('curPlayInfo_albumName'));

	};
	// 恢复清空缓存
	var resetAndClear = function () {
		bufferCache = 0;
		bufferCacheStep = 1e3;
	};

	// ===================初始化===============================

	// 清除定时器
	clearInterval(timer);
	// 储存曲目数量
	sessionStorage.setItem("songLen", $trs.length);
	// 进度条初始化
	$time_progressBar.css("width", "0%");
	$vol_progressBar.css("width", "50%");
	// 缓冲条初始化
	$progress_cache.css("width", "0%");
	// 音量初始化
	media.volume = volume;


	// ===============双击列表tr播放=======================

	// 双击列表tr播放
	$infoList_playlist.on("click", "tr", function (ev) {
		var _this = this;
		curPlayLine = +_this.dataset.index;
		playMusic(curPlayLine);
	});

	// 双击搜索列表tr播放
	$infoList_search.on("click", "tr", function () {
		playMusic($infoList_search.find("tr"), this);
	});


	// ===================播放器============================

	// 播放按钮
	$playBtnGroup.find(".play").on("click", function () {
		if (!media.src) {
			showTipBox("info", "没有播放资源，请选择曲目");
		} else {
			if (!media.paused) {
				media.pause();
				// play按钮样式
				stylePlayBtn($playBtnGroup.find(".play"), "pause");
			} else {
				media.play();
				// play按钮样式
				stylePlayBtn($playBtnGroup.find(".play"), "play");
			}
			audioError(media);
		}
	});
	// 切换下一首
	$playBtnGroup.find(".next").on("click", function () {
		resetAndClear();
		if (!media.src) {
			showTipBox("info", "没有播放资源，请选择曲目");
		} else {
			var songLen = +sessionStorage.getItem("songLen");
			curPlayLine = curPlayLine + 1 >= songLen ? 0 : curPlayLine + 1;
			playMusic(curPlayLine);
		}
	});
	// 切换上一首
	$playBtnGroup.find(".prev").on("click", function () {
		resetAndClear();
		if (!media.src) {
			showTipBox("info", "没有播放资源，请选择曲目");
		} else {
			var songLen = +sessionStorage.getItem("songLen");
			curPlayLine = curPlayLine - 1 < 0 ? songLen - 1 : curPlayLine - 1;
			playMusic(curPlayLine);
		}
	});
	// 静音
	$muteBtn.on("click", function () {
		if (!media.muted) {
			media.muted = true;
			$muteBtn.html('<i class="fa fa-volume-off" aria-hidden="true"></i>').attr("title", "恢复音量");
			$vol_progressBar.css("display", "none");
		} else {
			media.muted = false;
			$muteBtn.html('<i class="fa fa-volume-up" aria-hidden="true"></i>').attr("title", "静音");
			$vol_progressBar.css("display", "block");
		}
	});


	// ===============播放监听事件=======================

	// 更新时间
	$(media).on("timeupdate", function () {
		if (!isDrag) {
			var objTimeCurTime = formatTime(this.currentTime);
			var objTimeDuration = formatTime(this.duration);
			$curTime.html(objTimeCurTime);
			$duration.html(objTimeDuration);
			// 更新进度条
			$time_progressBar.css("width", (this.currentTime / this.duration).toFixed(4) * 100 + "%");
		}
	});
	// 播放完成 自动播放下一首 直至最后一首停止
	$(media).on("ended", function () {
		var songLen = +sessionStorage.getItem("songLen");
		if (curPlayLine + 1 >= songLen) {
			$(this).get(0).pause();
			stylePlayBtn($playBtnGroup.find(".play"), "pause");
		} else {
			curPlayLine = curPlayLine + 1;
			playMusic(curPlayLine);
		}
	});



	// ===============拖动进度条事件=======================

	// 改变时间
	dragProgress({
		$progressBox: $time_progressBox,
		$progressBar: $time_progressBar,
		$progressArc: $time_progressArc,
		$audio: $(media),
		callback_move: function (disX2) {
			// 改变播放时间
			isDrag = true;
			var changeVal = (media.duration * disX2 / 100).toFixed(2);
			var objTime = formatTime(changeVal);
			$curTime.html(objTime);
			return changeVal;
		},
		callback_up: function (changeVal) {
			// 改变播放位置
			isDrag = false;
			media.currentTime = changeVal;
			stylePlayBtn($playBtnGroup.find(".play"), "play");
		}
	});

	// 改变音量
	dragProgress({
		$progressBox: $vol_progressBox,
		$progressBar: $vol_progressBar,
		$progressArc: $vol_progressArc,
		$audio: $(media),
		callback_move: function (disX2) {
			// 更新音量
			media.volume = (1 * disX2 / 100).toFixed(2);
			if (media.volume <= 0) {
				$muteBtn.html('<i class="fa fa-volume-off" aria-hidden="true"></i>')
			} else {
				$muteBtn.html('<i class="fa fa-volume-up" aria-hidden="true"></i>')
			}
			return 0;
		}
	});

	// =======================磁盘转动动画===========================

	// 监听音频播放事件
	$(media).on("play", function () {
		// 转盘动画恢复
		$bgDisc.css({
			"-webkit-animation-play-state": "running",
			"animation-play-state": "running"
		});
		// 磁针放下
		$discNeedle.addClass("play");
	});
	// 监听音频暂停事件
	$(media).on("pause", function () {
		// 转盘动画停止
		$bgDisc.css({
			"-webkit-animation-play-state": "paused",
			"animation-play-state": "paused"
		});
		// 磁针抬起
		$discNeedle.removeClass("play");
	});


	// ===================缓冲进度=======================

	// 判断文件缓冲进度
	function laodBuffer() {
		// 音频就绪 media.readyState==4 可用数据足以开始播放
		if (media.readyState === 4) {
			// 获取已缓冲部分的 TimeRanges 对象
			var timeRanges = media.buffered;
			// 获取最后缓存范围的位置
			var timeBuffered = timeRanges.end(timeRanges.length - 1);
			// 获取缓存进度，值为0到1
			var bufferPercent = (timeBuffered / media.duration).toFixed(3);
			// 更新缓冲进度条
			$progress_cache.css("width", bufferPercent * 100 + "%");
			console.log(`已缓存${bufferPercent * 100}%`);
			if (bufferPercent >= 1) {
				clearInterval(timer);
			}
			if (bufferPercent === bufferCache) {
				bufferCacheStep *= 1.2;
				console.log(bufferCacheStep);
			}
			bufferCache = bufferPercent;
		}
		timer = setTimeout(laodBuffer, bufferCacheStep);
	}
	timer = setTimeout(laodBuffer, bufferCacheStep);
});