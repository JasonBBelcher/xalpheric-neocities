const releases = [
  { title: "Face The Shadow", cover: "assets/release1.png", audio: "music/face_the_shadow.mp3" },
  { title: "Contemplate", cover: "assets/release2.jpg", audio: "music/contemplate.mp3" },
  { title: "Hitch Crack Pot", cover: "assets/release3.png", audio: "music/hitchcrackpot.mp3" },
  { title: "Dogs in the Street", cover: "assets/release4.png", audio: "music/dogs_in_the_street.mp3" },
];
let current = 0;

function showRelease(index) {
  const r = releases[index];
  $("#cover").attr("src", r.cover);
  $("#title").text(r.title);
  $("#player").attr("src", r.audio);
  $("#download").attr("href", r.audio);
}

$(document).ready(() => {
  $(".nav.left").click(() => {
    current = (current - 1 + releases.length) % releases.length;
    showRelease(current);
  });

  $(".nav.right").click(() => {
    current = (current + 1) % releases.length;
    showRelease(current);
  });

  // Initialize the first release
  showRelease(current);
});
