$(document).ready(function() {
    $('header nav ul li a').click(function(event) {
        event.preventDefault();
        var section = $(this).attr('href');
        var section_pos = $(section).position();
        if (section_pos) {
            $(window).scrollTo({
                top: section_pos.top,
                left: '0px'
            }, 1000);
        }
    });

    $('.burger_icon').click(function() {
        $('header nav').toggleClass('show');
        $('header .burger_icon').toggleClass('active');
    });
    
    options = {
        offset: '#showHere',
        offsetSide: 'top',
        classes: {
            clone: 'banner--clone',
            stick: 'banner--stick',
            unstick: 'banner--unstick'
        }
    };
    
    banner = new Headhesive('.banner', options);
    
    wow = new WOW({
        animateClass: 'animated',
        mobile: false,
        offset: 50
    });
    
    wow.init();
    
    $('.bio').parallax("50%", 0.3);
    
    $('#play_video').click(function(e) {
        e.preventDefault();
        var video_link = $(this).data('video');
        video_link = '<iframe src="' + video_link + '" width="500" height="208" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
        $('.about_video').append(video_link).fadeIn(200);
    });
    
    $('.close_video').click(function(e) {
        e.preventDefault();
        $('.about_video').fadeOut(200, function() {
            $('iframe', this).remove();
        });
    });
});

function toggleAbstract(button, target) {    
    var abstract = document.getElementById(target);

    if (abstract.style.display === "none") {
        abstract.style.display = "block";
        button.textContent = "Hide Abstract";
    } else {
        abstract.style.display = "none";
        button.textContent = "Abstract";
    }
}