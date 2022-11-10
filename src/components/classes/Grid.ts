import p5Types from "p5";
import {CELL_TYPE, Cell} from './Cell';
import Constants, {Colors} from '../../tools/Constants';
import type { Vector } from '../../tools/Constants';
import Agent from './Agent';

export default class Grid {

    rows: number;
    cols: number;
    grid: Cell[][];
    population: Agent[];
    populationDeathToll: number;
    width: number;
    height: number;
    cell_height: number;
    cell_width: number;

    constructor(rows: number, cols: number, width: number, height: number, population: number) {
        this.populationDeathToll = 0;
        this.rows = rows;
        this.cols = cols;
        this.width = width;
        this.height = height;
        this.cell_width = this.width / this.cols;
        this.cell_height = this.height / this.rows;
        this.grid = this.createGrid(this.rows, this.cols);
        this.generateMaze();
        this.population = this.createPopulation(population); // TODO: make this population size a slider value
    }

    // Creates a new, empty grid (2d array of `Cells`) and returns it
    createGrid(rows: number, cols: number) {
        let grid: Cell[][] = [];
        for(let y = 0; y < this.rows; y++) {
            grid.push([]);
            for(let x = 0; x < this.cols; x++) {
                grid[y].push(new Cell(x, y, CELL_TYPE.wall));
            }
        }
        return grid;
    }

    show(p5: p5Types) {
        // Draw the grid of cells
        p5.push();
        for(let y = 0; y < this.grid.length; y++) {
            for(let x = 0; x < this.grid[y].length; x++) {
                switch(this.grid[y][x].type) {
                    case CELL_TYPE.empty: {
                        continue; // empty cells do not need to be rendered
                    }
                    case CELL_TYPE.wall: {
                        p5.stroke(Colors.PRIMARY);
                        p5.fill(Colors.PRIMARY);
                        break;
                    }
                    case CELL_TYPE.start_node: {
                        p5.fill(0, 255, 0);
                        break;
                    }
                    case CELL_TYPE.end_node: {
                        p5.fill(255, 0, 0);
                        break;
                    }
                }
                p5.rect(x * this.cell_width, y * this.cell_height,
                    this.cell_width, this.cell_height);
            }
        }
        p5.pop();

        // Draw the agents
        p5.push();
        for(let agent of this.population) {
            p5.ellipse(agent.pos.x, agent.pos.y, 5);
        }
        p5.pop();
    }

    update(p5: p5Types) {

        // All agents in the current population have died
        if(this.populationDeathToll >= this.population.length) { // TODO: use variable for population size

            // get the end node position
            let epos = this.getEndNodePosition();
            let ex = epos.x * this.cell_width + this.cell_width / 2;
            let ey = epos.y * this.cell_height + this.cell_height / 2;

            // TODO: remove this at some point
            p5.push();
            p5.fill('blue');
            p5.ellipse(ex, ey, 15);
            p5.pop();

            // calculate fitness for each agent
            let max_fitness = -1;
            let mx = -1;
            let my = -1;
            for(let agent of this.population) {

                // calculate and set the distance each agent is to the end node
                agent.setDistance(Math.sqrt(Math.abs(agent.pos.x - ex) + Math.abs(agent.pos.y - ey)));

                // calculate fitness of current agent
                agent.calculateFitness();

                // keep track of the max fitness (used for normalization)
                if(agent.fitness > max_fitness) {
                    max_fitness = agent.fitness;
                    mx = agent.pos.x;
                    my = agent.pos.y;
                }
            }

            // TODO: remove this at some point
            p5.push();
            p5.fill('red');
            p5.ellipse(mx, my, 15);
            p5.pop();

            // Create the mating pool
            let pool: Agent[] = [];

            // Add higher fitness agents to the mating pool more often than lower fitness agents
            for(let agent of this.population) {
                //normalize fitness value between 0-1
                agent.fitness /= max_fitness;
                let n = agent.fitness * 100;
                for(let i = 0; i < n; i++) pool.push(agent);
            }

            this.population = this.createPopulationFromPool(this.population.length, pool);
        }

        // Update each of the agents
        for(let agent of this.population) {

            // If the agent is already dead, skip it
            if(agent.isDead()) continue;

            // Agent is too old
            if(agent.age > 5000) {
                agent.kill();
                this.populationDeathToll++;
            }

            // Agent either hit a wall or is outside the bounds of the canvas
            if (!agent.inBounds(p5) || this.getCell(agent.pos.x, agent.pos.y).type === CELL_TYPE.wall) {
                agent.kill(); // set the agent's 'dead' value to true
                this.populationDeathToll++;
                continue;
            }

            // update the visited cells of the agent
            agent.updateVisitedCells(this.getCell(agent.pos.x, agent.pos.y));

            // If the agent is not dead, update it
            agent.update(this.cell_width, this.cell_height);
        }
    }

    updateCells(height: number, width: number) {
        this.width = height;
        this.height = width;
        this.cell_width = this.width / this.cols;
        this.cell_height = this.height / this.rows;
    }

    /**
     * Make a new class to regenerate the grid and population
     */
    generateNewMaze(rows: number, cols: number, population: number) {
        let newGrid = new Grid(rows, cols, this.width, this.height, population);
        return newGrid;
    }

    // Automatically generates a maze using randomized depth-first search iterative algorithm (https://en.wikipedia.org/wiki/Maze_generation_algorithm#Iterative_implementation)
    generateMaze() {
        // Choose the initial cell, mark it as visited and push it to the stack
        let current: Cell = this.grid[1][1];
        current.visited = true;
        let stack: Cell[] = [current];

        // Mark the current cell as the start node
        current.type = CELL_TYPE.start_node;

        // While the stack is not empty
        while(stack.length > 0) {
            // Pop a cell from the stack and make it a current cell
            current = stack.pop()!;

            // Get the unvisited neighbors of the current cell
            let neighbors: Cell[] = [];
            if(current.y >= 2 && !this.grid[current.y - 2][current.x].visited)             neighbors.push(this.grid[current.y - 2][current.x]);
            if(current.x >= 2 && !this.grid[current.y][current.x - 2].visited)             neighbors.push(this.grid[current.y][current.x - 2]);
            if(current.y <= this.rows - 3 && !this.grid[current.y + 2][current.x].visited) neighbors.push(this.grid[current.y + 2][current.x]);
            if(current.x <= this.cols - 3 && !this.grid[current.y][current.x + 2].visited) neighbors.push(this.grid[current.y][current.x + 2]);

            // Make neighbors part of the maze
            for(let neighbor of neighbors) neighbor.type = CELL_TYPE.empty;

            // If the current cell has any neighbours which have not been visited
            if(neighbors.length > 0) {

                // Push the current cell to the stack
                stack.push(current);

                // Choose one of the unvisited neighbours
                let chosen = neighbors[Math.floor(Math.random() * neighbors.length)];

                // Remove the wall between the current cell and the chosen cell
                if(chosen.y < current.y) this.grid[current.y - 1][current.x].type      = CELL_TYPE.empty;
                else if(chosen.y > current.y) this.grid[current.y + 1][current.x].type = CELL_TYPE.empty;
                else if(chosen.x < current.x) this.grid[current.y][current.x - 1].type = CELL_TYPE.empty;
                else if(chosen.x > current.x) this.grid[current.y][current.x + 1].type = CELL_TYPE.empty;

                // Mark the chosen cell as visited and push it to the stack
                chosen.visited = true;
                stack.push(chosen);
            }
        }

        // Set the end node position
        this.grid[this.rows - 2][this.cols - 2].type = CELL_TYPE.end_node;
    }

    // Creates and returns a new population of size `n`
    createPopulation(n: number) {
        let population: Agent[] = [];
        let start_node_pos = this.getStartNodePosition();
        for(let i = 0; i < n; i++) {
            population.push(
                new Agent(start_node_pos.x * this.cell_width + this.cell_width / 2,
                    start_node_pos.y * this.cell_height + this.cell_height / 2)
            ); // TODO: agents should start at the start node (new Agent(start_node.x, start_node.y))
        }
        this.populationDeathToll = 0; // reset the death toll of the current population
        return population;
    }

    // Create a population using the parents from the selection pool
    createPopulationFromPool(n: number, pool: Agent[]) {
        let population: Agent[] = [];
        let start_node_pos = this.getStartNodePosition();

        while(population.length < n) {
            let parent_a_dna = pool[Math.floor(Math.random() * pool.length)].dna;
            let parent_b_dna = pool[Math.floor(Math.random() * pool.length)].dna;
            let min_dna_length = Math.min(parent_a_dna.length, parent_b_dna.length);
            let mid = min_dna_length / 2;
            let child_dna: Vector[] = [];

            for(let i = 0; i < min_dna_length; i++) {
                if(Math.random() < 0.001) child_dna.push({x: Math.random() * (Constants.ACC_MAX - Constants.ACC_MIN) + Constants.ACC_MIN, y: Math.random() * (Constants.ACC_MAX - Constants.ACC_MIN) + Constants.ACC_MIN}); // TODO: implement mutation rate slider AND create a vector library
                else if(i < mid) child_dna.push(parent_a_dna[i]);
                else child_dna.push(parent_b_dna[i]);
            }

            population.push(new Agent(start_node_pos.x * this.cell_width + this.cell_width / 2,
                                      start_node_pos.y * this.cell_height + this.cell_height / 2, child_dna));
        }

        this.populationDeathToll = 0;
        return population;
    }

    // Returns a position object that represents the cell location of the start node in the grid {x: start node x position, y: start node y position}
    getStartNodePosition() {
        for(let y = 0; y < this.grid.length; y++) {
            for(let x = 0; x < this.grid[y].length; x++) {
                if(this.grid[y][x].type === CELL_TYPE.start_node) {
                    return {x: x, y: y};
                }
            }
        }
        return {x: -1, y: -1};
    }

    // Returns a position object that represents the cell location of the end node in the grid {x: end node x position, y: end node y position}
    getEndNodePosition() {
        for(let y = 0; y < this.grid.length; y++) {
            for(let x = 0; x < this.grid[y].length; x++) {
                if(this.grid[y][x].type === CELL_TYPE.end_node) {
                    return {x: x, y: y};
                }
            }
        }
        return {x: -1, y: -1};
    }

    getCell(x: number, y: number) {
        let cell_y = Math.floor(y/this.cell_height);
        let cell_x = Math.floor(x/this.cell_width);
        return this.grid[cell_y][cell_x];
    }
}
