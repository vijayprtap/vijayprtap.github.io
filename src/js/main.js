;(function () {
	
	'use strict';

	var isMobile = {
		Android: function() {
			return navigator.userAgent.match(/Android/i);
		},
			BlackBerry: function() {
			return navigator.userAgent.match(/BlackBerry/i);
		},
			iOS: function() {
			return navigator.userAgent.match(/iPhone|iPad|iPod/i);
		},
			Opera: function() {
			return navigator.userAgent.match(/Opera Mini/i);
		},
			Windows: function() {
			return navigator.userAgent.match(/IEMobile/i);
		},
			any: function() {
			return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
		}
	};

	
	var fullHeight = function() {

		if ( !isMobile.any() ) {
			$('.js-fullheight').css('height', $(window).height());
			$(window).resize(function(){
				$('.js-fullheight').css('height', $(window).height());
			});
		}
	};

	// Parallax
	var parallax = function() {
		$(window).stellar();
	};

	var contentWayPoint = function() {
		var i = 0;
		$('.animate-box').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('animated-fast') ) {
				
				i++;

				$(this.element).addClass('item-animate');
				setTimeout(function(){

					$('body .animate-box.item-animate').each(function(k){
						var el = $(this);
						setTimeout( function () {
							var effect = el.data('animate-effect');
							if ( effect === 'fadeIn') {
								el.addClass('fadeIn animated-fast');
							} else if ( effect === 'fadeInLeft') {
								el.addClass('fadeInLeft animated-fast');
							} else if ( effect === 'fadeInRight') {
								el.addClass('fadeInRight animated-fast');
							} else {
								el.addClass('fadeInUp animated-fast');
							}

							el.removeClass('item-animate');
						},  k * 100, 'easeInOutExpo' );
					});
					
				}, 50);
				
			}

		} , { offset: '85%' } );
	};



	var goToTop = function() {

		$('.js-gotop').on('click', function(event){
			
			event.preventDefault();

			$('html, body').animate({
				scrollTop: $('html').offset().top
			}, 500, 'easeInOutExpo');
			
			return false;
		});

		$(window).scroll(function(){

			var $win = $(window);
			if ($win.scrollTop() > 200) {
				$('.js-top').addClass('active');
			} else {
				$('.js-top').removeClass('active');
			}

		});
	
	};

	var pieChart = function() {
		$('.chart').easyPieChart({
			scaleColor: false,
			lineWidth: 4,
			lineCap: 'butt',
			barColor: '#FF9000',
			trackColor:	"#f5f5f5",
			size: 160,
			animate: 1000
		});
	};

	var skillsWayPoint = function() {
		if ($('#fh5co-skills').length > 0 ) {
			$('#fh5co-skills').waypoint( function( direction ) {
										
				if( direction === 'down' && !$(this.element).hasClass('animated') ) {
					setTimeout( pieChart , 400);					
					$(this.element).addClass('animated');
				}
			} , { offset: '90%' } );
		}

	};


	// Loading page
	var loaderPage = function() {
		$(".fh5co-loader").fadeOut("slow");
	};

	// Buy Me a Coffee popover. Vanilla on purpose - the page also loads
	// Bootstrap 3 and 5 side by side, so the jQuery plugin API is not
	// safe to assume here.
	var coffeeWidget = function() {

		var fab = document.getElementById("coffee-fab");
		var popover = document.getElementById("fh5co-coffee");
		if(!fab || !popover) { return; }

		var closeBtn = document.getElementById("coffee-close");

		var isOpen = function() {
			return popover.classList.contains("open");
		};

		var setOpen = function(state) {
			popover.classList["toggle"]("open", state);
			fab.setAttribute("aria-expanded", state ? "true" : "false");
		};

		fab.addEventListener("click", function(event) {
			// Stop here rather than at document, so the outside-click
			// handler below never sees this same click and closes the
			// popover on the very tick it was opened.
			event.stopPropagation();
			setOpen(!isOpen());
		});

		if(closeBtn) {
			closeBtn.addEventListener("click", function() {
				setOpen(false);
			});
		}

		// A "Buy" button reveals the payment QR rather than following
		// item.link: those are placeholders, and the QR plus the UPI id are
		// the actual way to pay. The popover is its own scroll container,
		// so this animates the panel and leaves the page where it is.
		// stopPropagation is deliberately not called - the outside-click
		// handler below relies on seeing every other click.
		var qrEl = document.getElementById("coffee-qr");
		if(qrEl) {
			document.addEventListener("click", function(event) {
				var trigger = event.target.closest && event.target.closest(".btn-buy");
				if(!trigger || !popover.contains(trigger)) { return; }
				event.preventDefault();
				var smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				qrEl.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
			});
		}

		document.addEventListener("click", function(event) {
			if(!isOpen()) { return; }
			if(popover.contains(event.target) || fab.contains(event.target)) { return; }
			setOpen(false);
		});

		document.addEventListener("keydown", function(event) {
			if(event.key !== "Escape" || !isOpen()) { return; }
			setOpen(false);
			fab.focus();
		});

		var flash = function(trigger, label) {
			trigger.textContent = label;
			trigger.classList.add("copied");
			setTimeout(function() {
				trigger.textContent = "Copy";
				trigger.classList.remove("copied");
			}, 1500);
		};

		document.addEventListener("click", function(event) {
			var trigger = event.target.closest && event.target.closest(".coffee-copy");
			if(!trigger) { return; }
			var source = document.getElementById(trigger.getAttribute("data-copy-target"));
			if(!source) { return; }
			// clipboard.writeText only exists in a secure context, and this
			// site is also served over plain http during local preview.
			var written = (navigator.clipboard && navigator.clipboard.writeText)
				? navigator.clipboard.writeText(source.textContent.trim())
				: Promise.reject();
			written.then(function() {
				flash(trigger, "Copied");
			}).catch(function() {
				flash(trigger, "Failed");
			});
		});

	};

	// Custom arrow cursor (the .fh5co-cursor element from partials/cursor.html).
	// Vanilla on purpose, same reason as above.
	//
	// Tuning lives in src/_data/cursor.json and arrives as data-* attributes;
	// these are the fallbacks for any attribute that is missing. The arrow is
	// pinned to the pointer exactly (no positional lag, so click accuracy never
	// suffers) and only its rotation is smoothed, which is what makes it read as
	// a plane: the nose follows the direction of travel, and it leans into
	// lateral acceleration the way an aircraft banks into a turn.
	var CURSOR_DEFAULTS = {
		enabled: true,
		size: 40,
		headingRate: 18,
		idleSpeed: 40,
		headingNoiseFloor: 220,
		idleRate: 4,
		idleGraceMs: 120,
		idlePointingUpDeg: 0,
		velocityRate: 24,
		bankRate: 12,
		bankMaxDeg: 34,
		bankGravity: 9000
	};

	// Shortest signed distance from a to b around a circle, in degrees. Without
	// this, a heading that crosses +/-180 spins the long way round.
	var shortestArc = function(a, b) {
		return ((((b - a) % 360) + 540) % 360) - 180;
	};

	// Fraction of the remaining distance to cover over dt, for a rate in 1/s.
	// Using exp() rather than a fixed lerp keeps the feel identical at 60Hz
	// and 144Hz instead of making it frame-rate dependent.
	var approach = function(rate, dt) {
		return 1 - Math.exp(-rate * dt);
	};

	var customCursor = function() {
		var el = document.querySelector('.fh5co-cursor');
		// Touch devices get no cursor element, and CSS only hides the native
		// pointer where a real one exists, so bail out rather than loop.
		if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) { return; }

		var data = el.dataset;
		var number = function(name, fallback) {
			var parsed = parseFloat(data[name]);
			return isFinite(parsed) ? parsed : fallback;
		};
		var cfg = {
			enabled: data.enabled !== 'false',
			size: number('size', CURSOR_DEFAULTS.size),
			headingRate: number('headingRate', CURSOR_DEFAULTS.headingRate),
			idleSpeed: number('idleSpeed', CURSOR_DEFAULTS.idleSpeed),
			headingNoiseFloor: Math.max(0, number('headingNoiseFloor', CURSOR_DEFAULTS.headingNoiseFloor)),
			idleRate: number('idleRate', CURSOR_DEFAULTS.idleRate),
		idleGraceMs: Math.max(0, number('idleGraceMs', CURSOR_DEFAULTS.idleGraceMs)),
			idlePointingUpDeg: number('idlePointingUpDeg', CURSOR_DEFAULTS.idlePointingUpDeg),
			velocityRate: number('velocityRate', CURSOR_DEFAULTS.velocityRate),
			bankRate: number('bankRate', CURSOR_DEFAULTS.bankRate),
			bankMaxDeg: Math.abs(number('bankMaxDeg', CURSOR_DEFAULTS.bankMaxDeg)),
			bankGravity: Math.abs(number('bankGravity', CURSOR_DEFAULTS.bankGravity)) || 1
		};
		if (!cfg.enabled) { return; }

		// With reduced motion we keep today's behaviour: a plain follow with no
		// rotation, matching how iridiums.js freezes its own animation.
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			var tx = -100, ty = -100, plain = 0;
			var drawPlain = function() {
				plain = 0;
				el.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
			};
			document.addEventListener('mousemove', function(e) {
				tx = e.clientX; ty = e.clientY;
				if (!plain) { plain = window.requestAnimationFrame(drawPlain); }
			}, { passive: true });
			document.addEventListener('mouseleave', function() {
				tx = -100; ty = -100;
				if (!plain) { plain = window.requestAnimationFrame(drawPlain); }
			});
			return;
		}

		var half = cfg.size / 2;
		var targetX = -100;
		var targetY = -100;
		var prevX = -100;
		var prevY = -100;
		var velX = 0;
		var velY = 0;
		var accX = 0;
		var accY = 0;
		var lastVelX = 0;
		var lastVelY = 0;
		var hasVel = false;
		var angle = 0;
		var bank = 0;
		var last = 0;
		var frame = 0;
		var parked = true;
		var lastMoveAt = -1e9;

		var render = function() {
			// Centring lives here rather than in negative margins so that
			// cfg.size stays a real parameter instead of assuming 40px.
			// Bank is added to the heading: a flat 2D arrow cannot truly roll
			// about its nose axis, so the lean is folded into the rotation.
			el.style.transform = 'translate3d(' + (targetX - half) + 'px,' +
				(targetY - half) + 'px,0) rotate(' + (angle + bank) + 'deg)';
		};

		var step = function(now) {
			frame = 0;
			// A tab-switch or a long GC pause can hand us a huge dt, which would
			// fling the rotation. Cap it and treat the first frame as no motion.
			var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
			last = now;

			var dx = targetX - prevX;
			var dy = targetY - prevY;

			// Pointer deltas are noisy, so velocity gets its own low pass before
			// acceleration is derived from it. Without this the raw first
			// derivative saturates the bank clamp on almost every mouse move.
			if (dt > 0) {
				var blend = approach(cfg.velocityRate, dt);
				velX += ((dx / dt) - velX) * blend;
				velY += ((dy / dt) - velY) * blend;
				// Acceleration is the derivative of the *smoothed* velocity, so
				// it inherits that damping instead of the raw pointer's jitter.
				// The very first frame has no previous velocity to difference
				// against, so it is skipped rather than reported as a huge spike.
				if (hasVel) {
					accX = (velX - lastVelX) / dt;
					accY = (velY - lastVelY) / dt;
				} else {
					hasVel = true;
				}
			}
			lastVelX = velX;
			lastVelY = velY;
			prevX = targetX;
			prevY = targetY;

			var speed = Math.sqrt(velX * velX + velY * velY);

			if (speed > cfg.idleSpeed) {
				// Three states, not two. `idleSpeed` alone used to gate both
				// steering and relaxing, which forced a bad trade: raising it far
				// enough to ignore sensor noise (a real mouse reports ~1.5px of
				// jitter per frame, so atan2 on that is essentially random) also
				// made the arrow swing back to "up" during slow deliberate
				// movement. A real mouse's heading is therefore only tracked above
				// `headingNoiseFloor`, which sits well under the speed at which
				// noise can dominate but over the speed of a slow drag.
				// Between the two thresholds the arrow simply holds its heading
				// and unwinds its bank, so it neither chatters nor drifts up.
				if (speed > cfg.headingNoiseFloor) {
					// atan2 on screen coords: 0 points right, and y grows downward.
					// The arrow art points up at 0deg, hence the +90 offset.
					var headingDeg = Math.atan2(velY, velX) * 180 / Math.PI + 90;
					angle += shortestArc(angle, headingDeg) * approach(cfg.headingRate, dt);

					// tan(phi) = a_lateral / g, the same relation an aircraft uses.
					// The normal is the unit vector 90 degrees off the heading.
					var rad = (headingDeg - 90) * Math.PI / 180;
					var nx = -Math.sin(rad);
					var ny = Math.cos(rad);
					var want = Math.atan2(accX * nx + accY * ny, cfg.bankGravity) * 180 / Math.PI;
					if (want > cfg.bankMaxDeg) { want = cfg.bankMaxDeg; }
					else if (want < -cfg.bankMaxDeg) { want = -cfg.bankMaxDeg; }
					bank += (want - bank) * approach(cfg.bankRate, dt);
				} else {
					bank += (0 - bank) * approach(cfg.bankRate, dt);
				}
			} else {
				// Stopped: ease back to neutral instead of freezing at whatever
				// angle the last flick left behind.
				angle += shortestArc(angle, cfg.idlePointingUpDeg) * approach(cfg.idleRate, dt);
				bank += (0 - bank) * approach(cfg.idleRate, dt);
			}

render();

			// rotate the heading into [-180,180) so `angle` never drifts unbounded
			// after many hours of continuous circling. The transform above is
			// rotation-equivalent either way, so this is purely numeric hygiene.
			angle = ((angle + 180) % 360 + 360) % 360 - 180;

			// Keep animating while the pointer moved recently, not merely while
			// *this* frame carried a delta. A single frame without a mousemove
			// used to end the loop and zero `last`, so every following burst
			// restarted from dt = 0, velocity never accumulated and the arrow
			// sat at 0 degrees no matter how fast you moved. The grace window
			// bridges those natural gaps.
			var withinGrace = (now - lastMoveAt) < cfg.idleGraceMs;
			var angleSettled = Math.abs(shortestArc(0, angle - cfg.idlePointingUpDeg)) <= 0.05;
			var bankSettled = Math.abs(bank) <= 0.05;
			if (withinGrace || !angleSettled || !bankSettled) {
				frame = window.requestAnimationFrame(step);
			} else {
				last = 0;
			}
		};

		var kick = function() {
			if (!frame) { frame = window.requestAnimationFrame(step); }
		};

		document.addEventListener('mousemove', function(e) {
			targetX = e.clientX;
			targetY = e.clientY;
			lastMoveAt = performance.now();
			if (parked) {
				// First move seeds the previous position, otherwise the initial
				// jump reads as an enormous velocity and snaps the heading.
				parked = false;
				prevX = targetX;
				prevY = targetY;
			}
			kick();
		}, { passive: true });

		// The cursor is parked off-screen until the first move, so it cannot
		// be left behind in the middle of the page after a click that did not
		// move the pointer (keyboard nav, some trackpad gestures).
		document.addEventListener('mouseleave', function() {
			parked = true;
			lastMoveAt = -1e9;
			targetX = -100;
			targetY = -100;
			prevX = -100;
			prevY = -100;
			velX = 0;
			velY = 0;
			accX = 0;
			accY = 0;
			lastVelX = 0;
			lastVelY = 0;
			hasVel = false;
			kick();
		});
	};


	$(function(){
		contentWayPoint();
		goToTop();
		loaderPage();
		fullHeight();
		parallax();
		// pieChart();
		skillsWayPoint();
		coffeeWidget();
		customCursor();
	});


}());