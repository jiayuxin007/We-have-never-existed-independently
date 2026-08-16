let isMobile = /iPhone|iPod|Android/i.test(navigator.userAgent);
let repel_radius; // distance from mouse at which repulsion starts
let radius_;
let angle = 0;
let points = [];
const particles = 8000;
const attraction = 0.01; // pulled back to their rotating home
const damping = 0.9; // friction, keeps motion smooth
const repel_strength = 28;

function setup() {
	describe(" A rotating sphere-like cloud of white points on a black background," +
		" scatters and reforms when interacted with by the mouse," +
		" creating a circular repulsion effect around the cursor.");
		
	if (isMobile) {
			createCanvas(360, 360);
			radius_ = 160;
			repel_radius = 60;
		} else {
			createCanvas(900, 700);
			radius_ = 250;
			repel_radius = 90;
		}

		pixelDensity(1); stroke(255); strokeWeight(2);
		// fill points array
		for (let i = 0; i < particles; i++) {
			points.push({
				index: i,
				pos: createVector(0, 0),
				vel: createVector(0, 0)
			});
		}
		// iniciate them at angle = 0
		angle = 0; updateTargets();
		for (let p of points) p.vel.set(0, 0);
	}

	function draw() {
		background(0);
		translate(width / 2, height / 2);

		let mouse = createVector(mouseX - width / 2, mouseY - height / 2);

		for (let p of points) {
			let i = p.index;

			// compute the rotating “home” position
			let homeX = sin(i + angle) * sin(i * i) * radius_;
			let homeY = cos(i * i) * radius_;
			let home = createVector(homeX, homeY);

			// spring force toward home ----
			let toHome = p5.Vector.sub(home, p.pos);
			let spring = toHome.mult(attraction);
			p.vel.add(spring);

			// mouse repulsion (strong when very close) ----
			let awayFromMouse = p5.Vector.sub(p.pos, mouse);
			let distSq = awayFromMouse.magSq();
			if (distSq > 0.1 && distSq < repel_radius * repel_radius) {
				let distance = sqrt(distSq);
				awayFromMouse.normalize();
				// natural falloff
				let repel = repel_strength * (1 - distance / repel_radius);
				awayFromMouse.mult(repel);
				p.vel.add(awayFromMouse);
			}

			// damping and move
			p.vel.mult(damping);
			p.pos.add(p.vel);

			point(p.pos.x, p.pos.y);
		}
		angle += 0.01;
	}

	// put the initial positions right
	function updateTargets() {
		for (let p of points) {
			let i = p.index;
			let x = sin(i + angle) * sin(i * i) * radius_;
			let y = cos(i * i) * radius_;
			p.pos.set(x, y);
		}
	}