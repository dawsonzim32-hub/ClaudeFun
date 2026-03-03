/*
 * PaperWrapped - Wrapped Experience Controller
 *
 * Handles slide navigation (tap/click/keyboard to advance),
 * count-up animations for numbers, and the trend chart drawing.
 */

(function () {
    "use strict";

    // ---- Slide Navigation ----

    var slides = document.querySelectorAll(".slide");
    var currentSlide = 0;
    var totalSlides = slides.length;
    var isAnimating = false;

    // Build progress dots
    var dotsContainer = document.getElementById("progress-dots");
    for (var i = 0; i < totalSlides; i++) {
        var dot = document.createElement("div");
        dot.className = "dot" + (i === 0 ? " active" : "");
        dotsContainer.appendChild(dot);
    }
    var dots = dotsContainer.querySelectorAll(".dot");

    function goToSlide(index) {
        if (index < 0 || index >= totalSlides || isAnimating) return;
        isAnimating = true;

        // Deactivate current slide
        slides[currentSlide].classList.remove("active");
        dots[currentSlide].classList.remove("active");

        // Activate new slide
        currentSlide = index;
        slides[currentSlide].classList.add("active");
        dots[currentSlide].classList.add("active");

        // Trigger animations on the new slide
        triggerSlideAnimations(slides[currentSlide]);

        // Allow next transition after animation completes
        setTimeout(function () {
            isAnimating = false;
        }, 700);
    }

    function nextSlide() {
        if (currentSlide < totalSlides - 1) {
            goToSlide(currentSlide + 1);
        }
    }

    function prevSlide() {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1);
        }
    }

    // Click/tap to advance
    document.getElementById("wrapped-app").addEventListener("click", function (e) {
        // Don't navigate if clicking a link
        if (e.target.tagName === "A") return;
        nextSlide();
    });

    // Keyboard navigation
    document.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === " ") {
            e.preventDefault();
            nextSlide();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prevSlide();
        }
    });

    // Swipe support for mobile
    var touchStartX = 0;
    document.addEventListener("touchstart", function (e) {
        touchStartX = e.changedTouches[0].screenX;
    });
    document.addEventListener("touchend", function (e) {
        var diff = touchStartX - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) nextSlide();
            else prevSlide();
        }
    });

    // ---- Slide Animations ----

    function triggerSlideAnimations(slide) {
        // Count-up animation for big numbers
        var countEl = slide.querySelector(".anim-count");
        if (countEl) {
            animateCount(countEl);
        }

        // Draw trend chart if this slide has one
        var canvas = slide.querySelector("#trend-canvas");
        if (canvas && typeof trendData !== "undefined") {
            drawTrendChart(canvas, trendData);
        }
    }

    function animateCount(el) {
        var target = parseInt(el.getAttribute("data-target"), 10);
        var duration = 1500;
        var startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);

            // Ease-out curve for smooth deceleration
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target;
            }
        }

        requestAnimationFrame(step);
    }

    // ---- Trend Chart (drawn on canvas) ----

    function drawTrendChart(canvas, data) {
        if (!data || data.length < 2) return;

        var ctx = canvas.getContext("2d");
        var w = canvas.width;
        var h = canvas.height;
        var padding = 40;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Find min/max for scaling
        var values = data.map(function (d) { return d.average; });
        var minVal = Math.max(0, Math.min.apply(null, values) - 10);
        var maxVal = Math.min(100, Math.max.apply(null, values) + 10);
        var range = maxVal - minVal || 1;

        // Points
        var points = [];
        for (var i = 0; i < data.length; i++) {
            var x = padding + (i / (data.length - 1)) * (w - padding * 2);
            var y = h - padding - ((data[i].average - minVal) / range) * (h - padding * 2);
            points.push({ x: x, y: y });
        }

        // Draw grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        for (var g = 0; g <= 4; g++) {
            var gy = padding + (g / 4) * (h - padding * 2);
            ctx.beginPath();
            ctx.moveTo(padding, gy);
            ctx.lineTo(w - padding, gy);
            ctx.stroke();
        }

        // Animated line drawing
        var animDuration = 1200;
        var startTime = null;

        function drawFrame(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / animDuration, 1);
            var eased = 1 - Math.pow(1 - progress, 2);
            var drawCount = Math.ceil(eased * points.length);

            // Clear and redraw grid
            ctx.clearRect(0, 0, w, h);

            // Grid
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1;
            for (var g2 = 0; g2 <= 4; g2++) {
                var gy2 = padding + (g2 / 4) * (h - padding * 2);
                ctx.beginPath();
                ctx.moveTo(padding, gy2);
                ctx.lineTo(w - padding, gy2);
                ctx.stroke();
            }

            // Line
            if (drawCount > 1) {
                // Glow effect
                ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
                ctx.shadowBlur = 15;
                ctx.strokeStyle = "white";
                ctx.lineWidth = 3;
                ctx.lineJoin = "round";
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (var j = 1; j < drawCount; j++) {
                    ctx.lineTo(points[j].x, points[j].y);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Dots
                for (var k = 0; k < drawCount; k++) {
                    ctx.beginPath();
                    ctx.arc(points[k].x, points[k].y, 5, 0, Math.PI * 2);
                    ctx.fillStyle = "white";
                    ctx.fill();
                }
            }

            // Month labels
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.font = "12px -apple-system, sans-serif";
            ctx.textAlign = "center";
            for (var m = 0; m < data.length; m++) {
                ctx.fillText(data[m].month, points[m].x, h - 10);
            }

            if (progress < 1) {
                requestAnimationFrame(drawFrame);
            }
        }

        requestAnimationFrame(drawFrame);
    }

    // Trigger first slide animations on load
    triggerSlideAnimations(slides[0]);

})();
