import React, { ChangeEvent } from 'react';
import Styles from './SliderStyles';
import RangeSlider from 'react-bootstrap-range-slider';

export interface InputSliderProps {
	value: number,
	onChange: (ev: ChangeEvent<HTMLInputElement>, value: number) => void,
	min: number,
	max: number,
	step?: number,
	disabled?: boolean,
	tooltip?: 'on' | 'auto' | 'off',
}

export interface SliderProps extends InputSliderProps {
    title?: string,
	className?: string,
	exponential?: boolean
}

class Slider extends React.Component <SliderProps, {}> {

	constructor(props: SliderProps) {
		super(props)
		this.state = {}
	}

	// TODO: Implement exponential function
	exponential = (e: React.ChangeEvent<HTMLInputElement>, val: number): void => {
		let max = this.props.max;
		let min = this.props.min;

		let a = max/(min + Math.log(min * (max - min)));
		val = (1/min)*Math.exp((1/a)*val-min)+min;
		this.props.onChange(e, val);
	}

	render() {
		return (
			<Styles.SliderContainer className={this.props.className}>
				{this.props.title ? <p>{this.props.title}: {this.props.value}</p> : <></>}
				<RangeSlider size='sm' tooltip={'off'} step={2} {...this.props} className=''
					onChange={this.props.exponential ? this.exponential : this.props.onChange}/>
			</Styles.SliderContainer>
		);
	}
}

export default Slider;