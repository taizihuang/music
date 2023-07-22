/**
  * Theme: music player data request
  * Dependence: jQuery
  *
  */

function getMusicUrl() {
	return `http://music.163.com/song/media/`;
}

// create jsonp
function createJsonp(reqdata) {
	$.ajax({
		url: reqdata.url,
		data: reqdata.data,
		dataType: "jsonp",
		jsonp: "callback",
		success: function (res) {
			reqdata.callback(res);
		},
		error: function (err) {
			console.warn(err.status);
		}
	});
}
//  请求API (PHP) GET
function requestAPI(req) {
	$.ajax({
		url: req.url,
		type: req.method || "GET",
		data: req.data,
		dataType: "json",
		success: function (res) {
			req.callback(res);
		},
		error: function (err) {
			console.warn(err.status);
		}
	});
}

// 搜索请求数据
function searchRequest(str) {
	// 搜索内容非空判断
	if (!str) {
		showTipBox("error", "不能为空哟！");
	}else {
		console.log("res-200 " + str);
		showLoadingBox(false);
		// jsonp
		requestAPI({
			url: "https://service-f6aayhze-1318894526.gz.apigw.tencentcs.com/release/wmyblog_podcast?",
			data: {
				filename: str,
				folder: "Musics",
				type: 1
			},
			callback: function (data) {
				showLoadingBox(false);
				if (!data.result) {
					showTipBox("error", "查无此曲！"); // 查无此歌
				} else {
					console.log(data);
					// render DOM
					var songs = data.result.songs;
					var listLen = songs.length;
					var listHtml = '';
					for (var i = 0; i < listLen; i++) {
						listHtml += `
							<tr data-index="`+ i + `" data-song-name="` + songs[i]['name'] +  `" data-audio="` + songs[i]['audio'] + `" data-album-name="` + songs[i]['album']['name'] + `" data-singer-name="` + songs[i]['artists'][0]['name'] + `">
								<td class="index" data-num="`+ ((+i + 1) < 10 ? "0" + (+i + 1) : (+i + 1)) + `">` + ((+i + 1) < 10 ? "0" + (+i + 1) : (+i + 1)) + `</td>
								<td></td>
								<td>`+ songs[i]['name'] + `</td>
								<td>`+ songs[i]['artists'][0]['name'] + `</td>
								<td>`+ songs[i]['album']['name'] + `</td>
							</tr>
						`;
					}
					// refreshDOM
					$("#infoList_search").html(listHtml);
					// render search count
					$("#search_count").find(".input").html(str);
					$("#search_count").find(".count").html(listLen);



				}
			}
		});
	}
	sessionStorage.setItem("searchString", str);
}
// 刷新DOM tbody
function refreshDOM(songLen) {
	var tr = $("#infoList_playlist").find("tr").get(0), // 歌单列表第一行
		media = $("#audio").get(0), // 音频audio对象
		$songDetail = $("#songDetail"); // 歌曲详情页信息

	// 更新数据 歌曲数量
	sessionStorage.setItem("songLen", songLen);
	// 初始化播放资源
	$(media).attr("src", tr.dataset.audio);
	// 暂停播放
	media.pause();
	// 初始化播放时长
	$("#audio_duration").html(tr.dataset.durationFormat);
	// 高亮第一行
	$(tr).eq(0).find("td.index").html('<i class="fa fa-volume-up" aria-hidden="true"></i>').addClass("active");
	// 刷新小窗专辑封面
	$("#smallwindow_songName").html(tr.dataset.songName);
	$("#smallwindow_singerName").html(tr.dataset.singerName);

	// 储存当前歌曲必要信息
	sessionStorage.setItem("curPlayInfo_songName", tr.dataset.songName);
	sessionStorage.setItem("curPlayInfo_singersName", tr.dataset.singerName);
	sessionStorage.setItem("curPlayInfo_albumName", tr.dataset.albumName);
	sessionStorage.setItem("curPlayInfo_audioSrc", tr.dataset.audio);

	// 刷新歌曲详情页bg和poster

	// 刷新歌曲基本信息
	$songDetail.find(".songname").html(sessionStorage.getItem('curPlayInfo_songName'));
	$songDetail.find(".albumname").html(sessionStorage.getItem('curPlayInfo_singersName'));
	$songDetail.find(".singersname").html(sessionStorage.getItem('curPlayInfo_albumName'));

	// 生成歌词
	createScrollLrc();

}

// 初始化歌单数据
function initPlaylist(data) {
	var docFrag = document.createDocumentFragment(),
		result = data['result'],
		tracks = result['tracks'],
		songLen = tracks.length,
		tr = null,
		td = null,
		createTime = "",
		singerArr = [],
		allSinger = "";

	// 清空
	$("#infoList_playlist").html(' ');
	// 生产歌单列表
	for (var i = 0; i < songLen; i++) {
		// ms->s /1000  格式化时间 00:00
		// 多个歌手名字组合
		for (var j = 0; j < tracks[i]['artists'].length; j++) {
			singerArr.push(tracks[i]['artists'][j]['name']);
		}
		allSinger = singerArr.join(" / ");
		// 清除
		singerArr = [];

		// 创建tr 设置tr
		tr = document.createElement("tr");
		tr.dataset.index = i;
		tr.dataset.songName = tracks[i]['name'];
		tr.dataset.audio = tracks[i]['mp3Url'] || getMusicUrl();
		tr.dataset.singerName = allSinger;
		tr.dataset.albumName = tracks[i]['album']['name'];
		tr.innerHTML = `
			<td class="index" data-num="`+ ((+i + 1) < 10 ? "0" + (+i + 1) : (+i + 1)) + `">` + ((+i + 1) < 10 ? "0" + (+i + 1) : (+i + 1)) + `</td>
			<td></td>
			<td>`+ tracks[i]['name'] + `</td>
			<td>`+ allSinger + `</td>
			<td>`+ tracks[i]['album']['name'] + `</td>
		`;
		docFrag.appendChild(tr);
	}
	// 重新渲染DOM
	$("#infoList_playlist").append(docFrag);
	// 生成歌单的基本信息
	createTime = formatDate(result.createTime);
	$("#playlist_listPic").attr("src", result.coverImgUrl);
	$("#playlist_listName").html(result.name);
	$("#playlist_userFace").attr("src", result.creator.avatarUrl);
	$("#playlist_userName").html(result.creator.nickname);
	$("#playlist_createTime").html(createTime.Y + "-" + createTime.M + "-" + createTime.D);
	$("#playlist_trackCount").html(result.trackCount);
	$("#playlist_playCount").html(result.playCount);

	/* ==================== REFRESH DOM =============================== */
	refreshDOM(songLen);

}

// init
$(function () {

	// 基本信息
	var Author = {
		"nickname": "前端2017--闯",
		"id_like": "40730905"
	};
	// 搜索歌曲功能函数
	var funcSearch = function () {
		var strSearch = $("#inpSearch").val().trim();
		// 显示搜索页 隐藏列表页
		$("#pageMain").slideUp(300);
		$("#pageSearch").slideDown(300);
		// 缩放歌曲详情页
		$("#pageSongDetail").css({
			"top": "100%",
			"right": "100%",
			"opacity": 0
		});
		// 请求数据
		searchRequest(strSearch);
	};

	// ===============初始化========================

	// 初始化歌单 我喜欢的音乐
	showLoadingBox(false);
	requestAPI({
		url: "/api/playlist/detail/",
		data: {
			"id": Author["id_like"]
		},
		callback: function (data) {
			initPlaylist(data);
			showLoadingBox(false);
		}
	});

	// ===============搜索功能========================

	// 顶部菜单input回车搜索
	$("#inpSearch").on("keydown", function (ev) {
		var ev = ev || window.event;
		if (ev.keyCode === 13) {
			funcSearch();
		}
	});
	// 顶部菜单query图标点击搜索
	$("#top_searchBtn").on("click", function () {
		funcSearch();
	});

	// ===============歌单功能========================

	// 切换歌单与搜索页
	$("#list_create_like").on("click", function () {
		// 显示列表页 隐藏搜索页
		$("#pageSearch").slideUp(500);
		$("#pageMain").slideDown(500);
	});



	// ==============EXPORT=====================

	// export
	window.requestAPI = requestAPI;

});


