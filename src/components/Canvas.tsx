/*
 * For Tips and Advanced Usage read this Blog Post
 * https://levelup.gitconnected.com/integrating-p5-sketches-into-your-react-app-de44a8c74e91
 */
// Third party imports
import React from 'react';
import Sketch from 'react-p5';
import p5Types from "p5";
import { isMobile } from 'react-device-detect'

// Custom imports
import Grid from "./classes/Grid";
import CanvasStyles, { Parameters } from './CanvasStyles';
import Constants from '../tools/Constants';
import {Colors} from '../tools/Constants';

export type CanvasProps = {
	params: Parameters,
	windowWidth: number,
	setParameters: Function
}

class Canvas extends React.Component <CanvasProps, {}>{
    grid!: Grid;

	constructor(props: CanvasProps) {
		super(props);
		this.state = {};
	}

	setup = (p5: p5Types, parentRef: Element) => {
		p5.createCanvas(p5.windowWidth, p5.windowHeight - this.props.windowWidth * Constants.BANNER_HEIGHT_RATIO).parent(parentRef);
        this.grid = new Grid(this.props.params.gridRows, this.props.params.gridColumns, p5.width, p5.height, this.props.params.population);
	};

	draw = (p5: p5Types) => {
		p5.background(Colors.SECONDARY);

        this.grid.handleMouse(p5);
        this.grid.show(p5);

        // User paused
        if (this.props.params.pause) return;

		if (this.props.params.skipVisual) {
			let count = 0;
			while (!this.grid.isSolved() && count < 500000) {
				this.grid.update(p5);
				count++;
			}

			if (count > 0) this.props.setParameters({...this.props.params, pause: true, skipVisual: false})
		}

        // User is fast-forwarding
        for (let i = 0; i < this.props.params.speed; i++) {
            this.grid.update(p5);
        }
	};

	windowResized = (p5: p5Types) => {
		if (!isMobile) {
			p5.createCanvas(p5.windowWidth, p5.windowHeight - this.props.windowWidth * Constants.BANNER_HEIGHT_RATIO);
			this.grid.updateCells(p5.windowWidth, p5.windowHeight - this.props.windowWidth * Constants.BANNER_HEIGHT_RATIO);
		}
	}

	/**
	 * Called when the component updates due to its props changing
	 */
	componentDidUpdate(prevProps: {params: Parameters, windowWidth: number}) {
		if (prevProps.params.apply !== this.props.params.apply) {
			this.grid = this.grid.generateNewMaze(
				this.props.params.gridRows,
				this.props.params.gridColumns,
				this.props.params.population
			);
		}

		// If the mutation rate has changed, update it right away
		if (prevProps.params.mutation !== this.props.params.mutation) this.grid.setMutationRate(this.props.params.mutation);
	}

	render() {
		return (
			<CanvasStyles.Canvas>
				<Sketch setup={ this.setup } draw={ this.draw } windowResized={ this.windowResized }/>
			</CanvasStyles.Canvas>
		);
	}
}

export default Canvas;
