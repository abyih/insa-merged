import axios from 'axios';
import { OS_CONFIG } from './openstackConfig';

export const getOpenStackToken = async () => {
    const data = {
        auth: {
            identity: {
                methods: ["password"],
                password: {
                    user: {
                        name: OS_CONFIG.username,
                        domain: { name: OS_CONFIG.domain },
                        password: OS_CONFIG.password
                    }
                }
            },
            scope: {
                project: {
                    name: OS_CONFIG.project,
                    domain: { name: OS_CONFIG.domain }
                }
            }
        }
    };

    try {
        const response = await axios.post(`${OS_CONFIG.authUrl}/auth/tokens`, data);
        // Save token to localStorage so other components can use it
        const token = response.headers['x-subject-token'];
        localStorage.setItem('os_token', token);
        return token;
    } catch (error) {
        console.error("OpenStack Auth Error:", error);
        return null;
    }
};