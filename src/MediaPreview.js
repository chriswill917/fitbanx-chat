import {memo, useEffect, useState} from "react";
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';
import "./MediaPreview.css";

export default memo(function MediaPreview({src, mediaPreview, close, docType}) {
	const [height, setHeight] = useState("");

	useEffect(() => {
		setHeight(document.querySelector('.chat__body--container').offsetHeight);
	}, [])

	return(
		<div 
			ref={mediaPreview} 
			className="mediaPreview"
			style={{
				height: height,
			}}
		>
			<CloseRoundedIcon onClick={close} />
			{ docType === "image" && 
				<img key={src} src={src} alt="" />
			}
			{ docType === "video" && 
				<video width="320" height="240" controls key={src} src={src} alt="" />
			}
		</div>
	)
})