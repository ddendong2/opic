/* ============================================================
   OPIc AL 부스 — PWA 부트 스크립트 (pwa.js)
   기능:
   1) 서비스워커 등록 (설치 가능하게)
   2) 홈 화면 앱으로 실행 중이면(standalone) 아무것도 안 함 → 다시 안 물어봄
   3) 웹으로 처음 온 사람에게만 "홈 화면에 추가?" 배너 표시
   4) 안드로이드/크롬: 네이티브 설치창 호출
   5) 아이폰/사파리: 설치 방법 안내 (사파리는 자동설치 API가 없음)
   기존 HTML은 건드릴 필요 없이, <head>에 아래 두 줄만 추가하면 됨:
     <link rel="manifest" href="manifest.webmanifest">
     <script src="pwa.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 서비스워커 등록 ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* ---------- 2. 실행 환경 판별 ---------- */
  // 홈 화면 앱(standalone)으로 켰는지 — 그렇다면 배너를 절대 띄우지 않음
  var isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.startsWith('android-app://');

  var ua = window.navigator.userAgent || '';
  var isiOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  var isAndroid = /android/i.test(ua);
  var isMobile = isiOS || isAndroid || /mobile/i.test(ua);

  // 이미 홈 화면 앱으로 진입한 사용자 → 종료. 앞으로도 안 물어봄.
  if (isStandalone) return;

  // "다시 보지 않기"를 눌렀거나 이미 설치를 마친 사람은 저장해두고 안 띄움
  var DISMISS_KEY = 'opic_pwa_dismissed';
  function dismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }
  function setDismissed() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }
  // 설치가 완료되면 다음 진입은 standalone이라 여기 안 오지만, 안전하게 기록
  window.addEventListener('appinstalled', setDismissed);

  // 데스크톱에서는 굳이 홈 화면 배너가 의미 없으니 스킵 (원하면 이 줄 삭제)
  if (!isMobile) return;
  if (dismissed()) return;

  /* ---------- 3. 안드로이드용 네이티브 설치 이벤트 캐치 ---------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();       // 브라우저 기본 배너 막고
    deferredPrompt = e;       // 우리 커스텀 배너에서 쓰려고 저장
  });

  /* ---------- 4. 배너 UI 생성 ---------- */
  function buildBanner() {
    var css = document.createElement('style');
    css.textContent =
      '#opic-pwa{position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
      'background:#14213D;color:#FBFAF6;font-family:"Noto Sans KR",system-ui,sans-serif;' +
      'box-shadow:0 -8px 30px rgba(0,0,0,.28);padding:18px 18px calc(18px + env(safe-area-inset-bottom));' +
      'border-radius:20px 20px 0 0;transform:translateY(110%);transition:transform .45s cubic-bezier(.2,.9,.2,1);}' +
      '#opic-pwa.show{transform:translateY(0);}' +
      '#opic-pwa .row{display:flex;align-items:center;gap:14px;max-width:640px;margin:0 auto;}' +
      '#opic-pwa .ic{width:52px;height:52px;border-radius:14px;flex:0 0 52px;background:#0f1830;}' +
      '#opic-pwa .tx{flex:1;line-height:1.45;}' +
      '#opic-pwa .tx b{font-size:15px;font-weight:900;display:block;}' +
      '#opic-pwa .tx span{font-size:12.5px;opacity:.72;}' +
      '#opic-pwa .btns{display:flex;gap:8px;margin-top:14px;max-width:640px;margin-left:auto;margin-right:auto;}' +
      '#opic-pwa button{font-family:inherit;font-weight:800;border-radius:12px;cursor:pointer;border:none;padding:13px 16px;font-size:14px;}' +
      '#opic-pwa .yes{flex:1;background:#F26B21;color:#fff;}' +
      '#opic-pwa .no{background:transparent;color:#FBFAF6;opacity:.65;border:1.5px solid rgba(251,250,246,.35);}' +
      '#opic-pwa .guide{max-width:640px;margin:12px auto 0;font-size:13px;line-height:1.7;background:#0f1830;border-radius:12px;padding:12px 14px;display:none;}' +
      '#opic-pwa .guide.on{display:block;}' +
      '#opic-pwa .guide b{color:#F26B21;}' +
      '#opic-pwa .step{display:flex;gap:8px;margin:6px 0;align-items:flex-start;}' +
      '#opic-pwa .step i{flex:0 0 20px;height:20px;border-radius:50%;background:#F26B21;color:#fff;font-style:normal;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;}';
    document.head.appendChild(css);

    var wrap = document.createElement('div');
    wrap.id = 'opic-pwa';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', '홈 화면에 앱 추가');

    // 아이콘은 파일이 있으면 이미지, 없으면 그라데이션 박스로 대체
    var iconHtml = '<img class="ic" src="icon-192.png" alt="" onerror="this.style.display=\'none\'">';

    wrap.innerHTML =
      '<div class="row">' + iconHtml +
        '<div class="tx"><b>OPIc AL 부스를 앱으로 설치할까요?</b>' +
        '<span>홈 화면에서 바로 열고, 전체화면·오프라인으로 연습하세요.</span></div>' +
      '</div>' +
      '<div class="btns">' +
        '<button class="yes" id="opic-yes">예, 홈 화면에 추가</button>' +
        '<button class="no" id="opic-no">나중에</button>' +
      '</div>' +
      '<div class="guide" id="opic-guide">' +
        '<div class="step"><i>1</i><div>사파리 하단(또는 상단)의 <b>공유 버튼 ⬆️</b>을 누르세요.</div></div>' +
        '<div class="step"><i>2</i><div>메뉴를 내려 <b>‘홈 화면에 추가’</b>를 선택하세요.</div></div>' +
        '<div class="step"><i>3</i><div>오른쪽 위 <b>‘추가’</b>를 누르면 끝! 홈에 아이콘이 생겨요.</div></div>' +
      '</div>';
    document.body.appendChild(wrap);
    return wrap;
  }

  /* ---------- 5. 배너 동작 연결 ---------- */
  function initBanner() {
    var wrap = buildBanner();
    // 등장 애니메이션 (첫 진입 후 잠깐 뒤에)
    setTimeout(function () { wrap.classList.add('show'); }, 1200);

    function close() {
      wrap.classList.remove('show');
      setTimeout(function () { wrap.remove(); }, 450);
    }

    document.getElementById('opic-no').onclick = function () {
      setDismissed();  // 다음부터 안 물어봄
      close();
    };

    document.getElementById('opic-yes').onclick = function () {
      if (deferredPrompt) {
        // 안드로이드/크롬: 진짜 설치창 띄우기
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice && choice.outcome === 'accepted') setDismissed();
          deferredPrompt = null;
          close();
        });
      } else if (isiOS) {
        // 아이폰: 설치 API가 없으니 방법 안내를 펼침
        document.getElementById('opic-guide').classList.add('on');
        document.getElementById('opic-yes').textContent = '방법대로 추가해 주세요 👆';
      } else {
        // 그 외(설치 이벤트가 아직 안 온 안드로이드 등): 안내만
        document.getElementById('opic-guide').classList.add('on');
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBanner);
  } else {
    initBanner();
  }
})();
