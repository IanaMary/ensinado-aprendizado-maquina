import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  url = environment.apiUrl;
  private readonly endpointLogin: string = 'login';
  private readonly endpointUsuario: string = 'usuario';

  constructor(private http: HttpClient) { }

  login(email: string, senha: string) {
    const auth = btoa(`${email}:${senha}`);
    const httpOptions = {
      headers: new HttpHeaders({ Authorization: 'Basic ' + auth })
    };
    return this.http.post(`${this.url}${this.endpointLogin}`, { email: email, senha: senha }, httpOptions);
  }


  cadastrarAluno(body: any) {
    return this.http.post(`${this.url}${this.endpointUsuario}`, body);
  }
}
