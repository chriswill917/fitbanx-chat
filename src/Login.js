import {memo, useEffect} from 'react';
import { useHistory, useLocation } from "react-router-dom";
import { Button } from '@material-ui/core';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import './Login.css'

function Login(props) {

    const history = useHistory();
    const location = useLocation();
   
    const signIn = async (token) => {
       auth.signInWithCustomToken(token);
    }

    useEffect(async() => {
        if (props.data.token) {
            await signIn(props.data.token)
        }
    }, [props.data.token]);

    return (
        <div className="login">
            <div className="login__container">
                <div className="login__text">
                    <h1>Please wait...</h1>
                </div>
            </div>
        </div>
    )
}

export default memo(Login)