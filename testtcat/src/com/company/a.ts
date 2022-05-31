import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import { EMPTY, of } from 'rxjs';
import { flatMap, switchMap } from 'rxjs/operators';


@Component({
  selector: 'aaaa-rdv-generique',
  templateUrl: './rdv-generique.component.html'
})
export class RdvGeneriqueComponent implements OnInit {

  @ViewChild(InfoPersoComponent)
  private infoperso: InfoPersoComponent;

  @ViewChild('rdvIndisponibleModal')
  rdvIndisponibleModal: ModalDirective;

  @ViewChild(NgSelectComponent)
  ngSelect: NgSelectComponent;

  readonly INFORMELS_JD = 1597;

  form: FormGroup;
  jahiaProperties;

  public jours: Array<Date>;
  public heures: Array<any>;
  public selectedHeureCreneau: string;
  public creneauxLibre: Array<CreneauxRendezVous>;
  public selectedJourCreneau: Date;
  public showHeureFranceMsg: boolean;
  public selectedIdNomCentreAaaa;
  public selectedIdNomMotif;
  public libelleCentreAaaaSelected: string;
  isIdentified = null;
  compteInfos: CompteInfos = new CompteInfos();
  idNomHeureErrorMsg: string;
  idNomMotifErrorMsg: string;
  idNomCentreAaaaErrorMsg: string;
  modeRappel: boolean;
  centresAaaaList;
  motifsNonDeplacementList;
  idOrigine;
  chapterName;
  firstPageTag;
  isFirstPageTagged = false;
  pageConfirmationTag;
  showCalendar = false;
  showCentresAaaa;
  idNomCentreAaaa;
  formSteps: Array<any> = [{
    stepId: 1,
    stepValidationScenario: 'PREMIERE_PAGE',
    stepName: 'Planifiez votre rendez-vous',
    stepFields: ['telephone'],
    tagName: 'Planifiez_votre_rendez-vous'
  }];
  scenario;
  showPopin = false;
  reloadPage = true;
  codeJonction;
  indicateurTelephone;
  isAtelier = false;
  afficherPopin = false;
  selectedAtelier;
  nbAtelier = 0;
  switchToRappel: boolean;
  markTelephoneTouched = false;
  stepAfterAtelier = false;
  idMotif;
  idNomOrganisation;
  isIdNomOrganisationChecked = false;
  titre;
  demandeConfig;
  autreOrigine;
  lesInformelsConnaissance;
  visuelFace;
  siteKey = 'cadres';
  private sessionUser: any;
  referentielStatique;

  constructor(
    private demandeServiceApi: DemandeServiceAPI,
    private authenticationAPI: AuthenticationAPI,
    public utilService: UtilsService,
    private formulaireService: FormulaireService,
    private ateliersApi: AteliersApi,
    @Inject('JahiaProperties') jahiaProperties,
    private referentielStatiqueService: ReferentielStatiqueService,
    formBuilder: FormBuilder,
    private demandeServiceService: DemandeServiceService) {
    this.jahiaProperties = jahiaProperties;
    // Form construction
    this.form = formBuilder.group({
      idNomCentreAaaa: new FormControl(),
      idNomInformelEvent: new FormControl(),
      autreOrigine: new FormControl(),
      idNomMotifNonDeplacement: new FormControl(null, (control: AbstractControl) => !control.value && this.isNonDeplacement() ? null : { 'required': { value: control.value } }),
      telephone: new FormControl(null, [Validators.required, Validators.pattern('[+0-9]+')])
    });

  }

  ngOnInit() {
    this.referentielStatiqueService.initReferentiel(ReferentielTypeEnum.DEMANDE_SERVICE).map(referentiel => {
            return referentiel;
          }).subscribe(referentiel => {
          this.referentielStatique = referentiel;
          this.utilService.formSubmitted = false;
          const idMotifInformel = new URLSearchParams(location.search).get('id-motif');
          if (idMotifInformel) {
            this.idMotif = idMotifInformel;
            this.scenario = 'atelier';
            let codeNom = 'ORIGINE_EVENEMENT_CADRE';
            if (Number(idMotifInformel) === this.INFORMELS_JD) {
              codeNom = 'ORIGINE_EVENEMENT_JEUNE';
            }
            this.lesInformelsConnaissance = this.referentielStatique.filter(value => value.codePresentation ===  codeNom);
          } else if (this.jahiaProperties.scenario === 'atelier') {
            this.idMotif = new URLSearchParams(location.search).get('id-atelier');
            this.scenario = 'atelier';
          } else if (this.jahiaProperties.scenario === 'autoconso') {
            this.scenario = new URLSearchParams(location.search).get('origin').toLowerCase().replace('theme', '').replace('cadres', '').replace('cadre', '').replace('jd', '');
          } else {
            this.scenario = this.jahiaProperties.scenario;
          }
          this.firstPageTag = 'votre_rendez-vous_';
            if (this.jahiaProperties.scenario === 'atelier') {
              this.isAtelier = true;
              const critereRecherche = new CriteresRechercheDemande(this.jahiaProperties.scenario, null, this.idMotif);
              this.demandeServiceApi.getDemandeConfiguration(critereRecherche).subscribe(
                (response: any) => {
                  this.demandeConfig = response;
                  this.chapterName = response['chapitreXiti'];
                  this.visuelFace = this.referentielStatiqueService.getLibelle(this.demandeConfig['idNomCanal'], 'SERVICE_PRESTATION_CANAL');
                  this.form.removeControl('idNomMotifNonDeplacement');
                  this.authenticationAPI.getSessionUser(SitesNameEnum.CADRE)
                    .subscribe(sessionUser => {
                      this.sessionUser = sessionUser;
                      this.idOrigine = new URLSearchParams(location.search).get('id-origine');
                      this.showCentresAaaa = false;
                      this.titre = this.referentielStatiqueService.getLibelle(parseInt(this.idMotif, 10), 'DEMANDE_QUAND_MOTIF_EST_SERVICE');
                      if (sessionUser) {
                        this.isIdentified = true;
                        if (this.sessionUser.compteWebCadre.numeroTelephoneMobile != null) {
                          this.form.get('telephone').setValue((this.sessionUser.compteWebCadre.numeroTelephoneMobile).replace(/\s/g, ''));
                        }
                        this.selectedAtelier = JSON.parse(localStorage.getItem('selectedAtelier'));
                        localStorage.removeItem('selectedAtelier');
                        if (this.selectedAtelier && this.selectedAtelier['switchToRappel']) {
                          this.switchToRappel = true;
                          this.selectedAtelier = null;
                        }
                        this.afterLogin({ isIdentified: true, sessionUser: this.sessionUser });
                      }
                      if (!this.selectedAtelier) {
                        if (!this.switchToRappel) {
                          this.codeJonction = this.demandeConfig.codeJonction;
                          this.indicateurTelephone = this.demandeConfig.indicateurTelephone;
                          this.switchToRappel = this.indicateurTelephone == 0;
                          if (!isNil(this.codeJonction)) {
                            this.isAtelier = true;
                          } else if (!this.isIdentified) {
                            this.afficherPopin = true;
                          }
                        } else {
                          this.modeRappel = true;
                        }
                        this.showCalendar = true;
                      }
                    });
                });
            } else {
              this.afficherPopin = true;
              this.showCentresAaaa = true;
            }
            this.modeRappel = null;
            this.showHeureFranceMsg = true;
            // Retourne la liste des centres Aaaa
            this.getCentresAaaa();
            this.motifsNonDeplacementList = this.referentielStatique.filter(v => v.codePresentation === 'MOTIF_NON_DEPLACEMENT_SERVICE_DOMAIN');
        }
      );
  }

  public loadDemandeConfig($event) {
    this.demandeConfig = $event.demandeConfig;
    this.chapterName = this.demandeConfig.chapitreXiti;
    this.titre = this.referentielStatiqueService.getLibelle(this.demandeConfig.idNomMotif, 'DEMANDE_QUAND_MOTIF_EST_SERVICE');
  }

  public afterLogin($event) {
    window.scroll(0, 0);
    if (this.selectedAtelier && this.selectedAtelier['switchToRappel']) {
      this.selectedAtelier = null;
      this.isAtelier = true;
    }
    if (this.isIdentified && !this.reloadPage) {
      this.submitConnecte();
      return;
    }
    this.isIdentified = $event.isIdentified;
    if ($event.isIdentified) {
      this.sessionUser = $event.sessionUser;
      this.pageConfirmationTag = 'page_de_confirmation_' + this.chapterName + '_avec_compte';

      this.utilService.findCadreCompteInfos(this.sessionUser).pipe(
        switchMap(data => {
            this.compteInfos = data.compteInfos;
            this.initCadreOuJD(this.utilService.checkEtudiantJd(this.compteInfos));
            this.utilService.initTelephoneFromCompteInfo(this.form, this.compteInfos);
            this.autreOrigine = data.autreInfo['autreOrigine'];
            this.idNomOrganisation = data.autreInfo['idNomOrganisation'];
            this.isIdNomOrganisationChecked = true;
            if (this.selectedAtelier) {
              this.submitConnecte();
            }
            return this.utilService.haveEvenementEnCours(this.sessionUser.numeroCompte, this.scenario, this.siteKey);
          }
        )).subscribe(doesHaveEvent => {
          if (!doesHaveEvent) {
            if (!this.isAtelier && !this.selectedAtelier) {
              if (!this.isFirstPageTagged || this.scenario !== 'atelier') {
                this.firstPageTag += this.chapterName;
                this.isFirstPageTagged = true;
                if (this.jahiaProperties.scenario === 'autoconso') {
                  this.utilService.xitiTrackDemandeServiceBy(this.firstPageTag + '_avec_compte', this.jahiaProperties.scenario, this.isServiceAtelier());
                } else {
                  this.utilService.xitiTrackDemandeServiceBy(this.firstPageTag + '_avec_compte', this.chapterName, this.isServiceAtelier());
                }
              }
            }

          }
        }
      );
    } else {
      if (this.isAtelier && this.selectedAtelier) {
        this.stepAfterAtelier = true;
      } else {
        this.creneauxLibre = [];
        this.modeRappel = true;
      }
      this.firstPageTag += this.chapterName;
      if (this.jahiaProperties.scenario === 'autoconso') {
        this.utilService.xitiTrackDemandeServiceBy(this.firstPageTag + '_creation_compte', this.jahiaProperties.scenario, this.isServiceAtelier());
      } else {
        this.utilService.xitiTrackDemandeServiceBy(this.firstPageTag + '_creation_compte', this.chapterName, this.isServiceAtelier());
      }
      this.pageConfirmationTag = 'page_de_confirmation_' + this.chapterName + '_creation_compte';

    }
  }

  onChangeToRappel(event: any) {
    this.modeRappel = event.modeRappel;
    this.selectedJourCreneau = event.selectedDate;
    this.selectedHeureCreneau = event.selectedHeure;
    this.showHeureFranceMsg = false;
    this.afficherPopin = true;
    this.isAtelier = false;
  }

  onMajNbAteliers(event) {
    this.nbAtelier = event;
  }

  onSelectHeure(event: string) {
    this.selectedHeureCreneau = event;
  }

  onSelectJour(event: Date) {
    this.selectedJourCreneau = event;
  }

  onSelectAtelier(event) {
    this.selectedAtelier = event;
    if (this.selectedAtelier && this.selectedAtelier['lieu']) {
      this.libelleCentreAaaaSelected = this.selectedAtelier['lieu']['intitule'];
    }
  }

  findCreneauxLibres() {
    this.demandeServiceApi.findCreneauxLibres(this.scenario, this.form.get('idNomCentreAaaa').value, this.sessionUser.id,
      this.siteKey, null).subscribe((data: Array<any>) => {
      this.creneauxLibre = data;
      this.modeRappel = !((data instanceof Array) && data.length > 0);
      this.selectedJourCreneau = ((data instanceof Array) && data.length > 0) ? new Date(data[0].jour) : null;
      this.showCalendar = true;
    }, error => {
      this.showCalendar = true;
      this.creneauxLibre = [];
      this.modeRappel = true;
      console.error('forbidden', error);
    });
  }

  findJoursRappel() {
    this.selectedIdNomCentreAaaa = this.form.get('idNomCentreAaaa').value;
    this.libelleCentreAaaaSelected = this.getLibelleCentreAaaa(this.selectedIdNomCentreAaaa);
    this.selectedHeureCreneau = '';
    if (this.isIdentified) {
      this.findCreneauxLibres();
    } else {
      this.showCalendar = true;
      this.modeRappel = true;
    }
  }

  setMotif() {
    this.selectedIdNomMotif = this.form.get('idNomMotifNonDeplacement').value;
  }

  onSubmit() {
    if (!this.isAtelier || this.stepAfterAtelier) {
      if (this.isIdentified) {
        this.submitConnecte();
      } else {
        this.submitNonConnecte();
      }
    }
  }

  submitConnecte() {
    let serviceGeneriqueDto: any = null;
    const audit = new Audit();
    audit.dateCreation = new Date();
    audit.utilisateurCreation = this.sessionUser.numeroCompte;
    this.compteInfos.audit = audit;
    this.compteInfos.telephone = this.form.get('telephone').value;
    serviceGeneriqueDto = {
      audit: { dateCreation: new Date(), utilisateurCreation: this.sessionUser.numeroCompte.toString() },
      jourEvenement: !this.modeRappel ? this.selectedJourCreneau : null,
      heureEvenement: !this.modeRappel ? this.selectedHeureCreneau : null,
      compteInfos: this.compteInfos,
      idNomCentreAaaa: this.form.get('idNomCentreAaaa').value,
      idNomMotif: this.scenario === 'atelier' ? this.idMotif : this.selectedIdNomMotif,
      idNomHeure: this.modeRappel && !this.stepAfterAtelier ? this.selectedHeureCreneau : null,
      jour: this.modeRappel ? this.selectedJourCreneau : null,
      scenario: this.scenario,
      atelier: (this.isAtelier || this.selectedAtelier),
      idNomOrigin: this.idOrigine
    };
    this.validateStep().pipe(
      flatMap(isStepValid => {
        if (isStepValid) {
          if (this.isIdentified && this.reloadPage) {
            return this.authenticationAPI.getSessionUser(SitesNameEnum.CADRE);
          } else {
            return of(isStepValid);
          }
        } else {
          this.initErrors();
          window.scroll(0, 0);
          return EMPTY;
        }
      }),
      flatMap(isValid => {
        if (isValid) {
          return of(isValid);
        } else {
          this.reloadPage = false;
          this.showPopin = true;
          return EMPTY;
        }
      })
    ).subscribe(isStepValid => {
      if (isStepValid) {
        this.reloadPage = true;
        this.demandeServiceApi.validateDemandeRdv(serviceGeneriqueDto).subscribe(
          (response) => {
            if (response && isEmpty(response)) {
              this.demandeServiceApi.createDemandeRdv(serviceGeneriqueDto).subscribe(
                (resp) => {
                  if (resp['httpStatus'] && resp['httpStatus'] === 200) {
                    if (this.rdvIndisponibleModal) {
                      this.rdvIndisponibleModal.hide();
                    }
                    if (this.isAtelier || this.selectedAtelier) {
                      this.validerInscriptionInformels();
                    } else {
                      this.utilService.formSubmitted = true;
                      if (this.jahiaProperties.scenario === 'autoconso') {
                        this.utilService.xitiTrackDemandeServiceBy('page_de_confirmation_' + this.chapterName + '_avec_compte', this.jahiaProperties.scenario, this.isServiceAtelier());
                      } else {
                        this.utilService.xitiTrackDemandeServiceBy(this.pageConfirmationTag, this.chapterName, this.isServiceAtelier());
                      }
                    }
                  } else {
                    if (resp['calendrierconsultant.rendezvous.indisponible'] || resp['calendrierconsultant.rendezvous.parseProblem']) {
                      this.findCreneauxLibres();
                      if (this.rdvIndisponibleModal) {
                        this.rdvIndisponibleModal.show();
                      }
                    } else {
                      this.initErrorMsgs(resp);
                      window.scroll(0, 0);
                    }
                  }
                }, error => {
                  console.error('forbidden', error);
                  window.scroll(0, 0);
                });
            } else {
              this.initErrorMsgs(response);
              window.scroll(0, 0);
            }
          }, error => {
            console.error('forbidden', error);
            window.scroll(0, 0);
          });
      } else {
        this.initErrors();
        window.scroll(0, 0);
      }
    });
  }

  validerAtelier() {
    if (this.form.valid) {
      this.selectedAtelier['telephone'] = this.form.get('telephone').value;
      if (this.form.get('idNomInformelEvent')) {
        this.selectedAtelier['idNomInformelEvent'] = this.form.get('idNomInformelEvent').value;
      }
      if (this.sessionUser) {
        this.submitConnecte();
      } else {
        this.afficherPopin = true;
      }
    } else {
      this.markTelephoneTouched = true;
      this.formulaireService.markFormGroupTouched(this.form);
    }
  }

  submitNonConnecte() {
    this.form.setErrors(null);
    this.compteInfos = this.infoperso.form.value;
    this.compteInfos.telephone = this.form.get('telephone').value;
    let serviceGeneriqueDto: any = null;
    const audit = new Audit();
    audit.dateCreation = new Date();
    audit.utilisateurCreation = 'aaaa.fr';
    this.compteInfos.audit = audit;
    delete this.compteInfos['emailConfirm'];
    delete this.compteInfos['idNomInformelEvent'];
    delete this.compteInfos['autreOrigine'];
    serviceGeneriqueDto = {
      audit: { dateCreation: new Date(), utilisateurCreation: 'Aaaa.fr' },
      jourEvenement: !this.modeRappel ? this.selectedJourCreneau : null,
      heureEvenement: !this.modeRappel ? this.selectedHeureCreneau : null,
      compteInfos: this.compteInfos,
      idNomCentreAaaa: this.form.get('idNomCentreAaaa').value,
      idNomMotif: this.scenario === 'atelier' ? this.idMotif : this.selectedIdNomMotif,
      idNomHeure: this.modeRappel && !this.stepAfterAtelier ? this.selectedHeureCreneau : null,
      jour: this.modeRappel ? this.selectedJourCreneau : null,
      scenario: this.scenario,
      atelier: this.isAtelier,
      idNomOrigin: this.idOrigine
    };
    this.validateStep().subscribe(isStepValid => {
      if (isStepValid) {
        this.demandeServiceApi.validateDemandeRdv(serviceGeneriqueDto).subscribe(
          (response) => {
            if (response && isEmpty(response)) {
              this.demandeServiceApi.createDemandeRdv(serviceGeneriqueDto).subscribe(
                (resp) => {
                  if (resp['httpStatus'] && resp['httpStatus'] === 200) {
                    if (this.isAtelier) {
                      this.selectedAtelier['idUser'] = resp['idUser'];
                      this.validerInscriptionInformels();
                    } else {
                      this.utilService.formSubmitted = true;
                      if (this.jahiaProperties.scenario === 'autoconso') {
                        this.utilService.xitiTrackDemandeServiceBy('page_de_confirmation_' + this.chapterName + '_creation_compte', this.jahiaProperties.scenario, this.isServiceAtelier());
                      } else {
                        this.utilService.xitiTrackDemandeServiceBy(this.pageConfirmationTag, this.chapterName, this.isServiceAtelier());
                      }
                    }
                  } else {
                    this.initErrorMsgs(resp);
                    window.scroll(0, 0);
                  }
                }, error => {
                  console.error('forbidden', error);
                  window.scroll(0, 0);
                });
            } else {
              this.initErrorMsgs(response);
              window.scroll(0, 0);
            }
          }, error => {
            console.error('forbidden', error);
            window.scroll(0, 0);
          });
      } else {
        this.initErrors();
        window.scroll(0, 0);
      }
    });
  }

  validateStep() {
    if (this.selectedIdNomMotif === undefined && this.form.get('idNomMotifNonDeplacement')) {
      this.form.get('idNomMotifNonDeplacement').clearValidators();
      this.form.get('idNomMotifNonDeplacement').updateValueAndValidity();
    }
    if (!this.formulaireService.isValidForm(this.form, this.isIdentified ? undefined : this.infoperso.form) || (!this.selectedHeureCreneau && !this.selectedAtelier)) {
      return of(false);
    } else {
      return of(true);
    }
  }

  initErrors(response?) {
    if (response) {
      if (response['error'].dejaInscrit === 'dejaInscrit') {
        this.utilService.dejaInscrit = true;
        this.isAtelier = true;
        this.showCalendar = true;
        this.stepAfterAtelier = false;
      } else if (response['error']['atelierComplet'] === 'atelierComplet') {
        this.utilService.atelierComplet = true;
        this.isAtelier = true;
        this.showCalendar = true;
        this.stepAfterAtelier = false;
      } else {
        console.error(response);
      }
    } else {
      this.markTelephoneTouched = true;
      this.formulaireService.markFormGroupTouched(this.form);
      if (!this.isIdentified) {
        this.infoperso.initErrorMsgs();
      }
      if (!this.idNomCentreAaaa) {
        this.idNomCentreAaaaErrorMsg = 'Vous devez sélectionner un centre';
      } else {
        this.idNomCentreAaaaErrorMsg = '';
      }
      if (!this.selectedHeureCreneau) {
        this.idNomHeureErrorMsg = 'Vous devez sélectionner une date et heure de rendez-vous';
      } else {
        this.idNomHeureErrorMsg = '';
      }
      if (this.isNonDeplacement() && !this.selectedIdNomMotif) {
        this.idNomMotifErrorMsg = 'Vous devez sélectionner un motif';
      }
    }
  }

  getLibelleCentreAaaa(idNomenclature) {
    let libelle = null;
    this.centresAaaaList.forEach(function (item) {
      if (item.idNomenclature == idNomenclature) {
        libelle = item.libelle;
      }
    });
    return libelle;
  }

  getCentresAaaa() {
    this.demandeServiceApi.getCentresAaaaByScenario(this.scenario).subscribe((data: any) => {
      this.centresAaaaList = data;
      if (this.scenario === 'nextStep' || this.scenario === 'nextStepMiCarriere' || this.scenario === 'RendezVousConseil' || this.scenario === 'rendezVousConseilInternational') {
        this.centresAaaaList.push({
          libelle: 'Vous ne pouvez pas vous déplacer',
          idNomenclature: 102446
        });
      }
      if (this.demandeServiceService.idCentre) {
        this.form.get('idNomCentreAaaa').setValue(this.demandeServiceService.idCentre);
        this.findJoursRappel();
      }
    });
  }

  isNonDeplacement() {
    return (this.scenario === 'nextStep' || this.scenario === 'nextStepMiCarriere' || this.scenario === 'RendezVousConseil' || this.scenario === 'rendezVousConseilInternational')
      && this.form.get('idNomCentreAaaa').value === 102446;
  }

  validerInscriptionInformels() {
    const jsonData = this._formatJSONDemandeInscriptionInformelDto();
    this.ateliersApi.validationInformels(jsonData).subscribe(ret => {
        if (isEmpty(ret)) {
          this.ateliersApi.inscriptionInformels(jsonData).subscribe(response => {
              if (response['status'] && response['status'] === 200 && response['statusText'] === 'OK') {
                this.utilService.formSubmitted = true;
                this.utilService.xitiTrackDemandeServiceBy(this.pageConfirmationTag, this.chapterName, this.isServiceAtelier());
              }
            },
            (response) => {
              if (response['status'] && response['status'] === 200 && response['statusText'] === 'OK') {
                this.utilService.formSubmitted = true;
                this.utilService.xitiTrackDemandeServiceBy(this.pageConfirmationTag, this.chapterName, this.isServiceAtelier());
              } else {
                this.initErrors(response);
                window.scroll(0, 0);
              }
              return EMPTY;
            });
        }
      },
      (error) => {
        this.initErrors(error);
        window.scroll(0, 0);
        return EMPTY;
      });
  }

  // Création du JSON pour le DTO : DemandeInscriptionInformelDto
  _formatJSONDemandeInscriptionInformelDto() {
    const json = {};
    json['idAtelier'] = this.selectedAtelier['idAtelier'];
    json['idNomCivilite'] = this.compteInfos.idNomCivilite;
    json['prenom'] = this.compteInfos.prenom;
    json['nom'] = this.compteInfos.nom;
    json['adresseEmail'] = this.compteInfos.adresseEmail;
    json['numeroTelephone'] = this.selectedAtelier['telephone'];
    if (this.form.get('autreOrigine') && this.form.get('autreOrigine').value) {
      this.autreOrigine = this.form.get('autreOrigine').value;
    }
    json['autreOrigine'] = this.autreOrigine;
    json['dateNaissance'] = this.compteInfos.dateNaissance;
    json['adressePostale'] = this.compteInfos.adressePostale;
    json['idNomStatutActuel'] = this.compteInfos.idNomStatutActuel;
    json['idNomInformelEvent'] = this.selectedAtelier['idNomInformelEvent'];
    if (this.visuelFace === 'Face à face') {
      json['lieuAnimation'] = this.selectedAtelier['lieu']['intitule'];
    }
    json['enActivite'] = this.compteInfos.indicateurEmploiOccupe ? 'OUI' : 'NON';
    json['idNomMotif'] = this.idMotif;
    json['isJd'] = this.jahiaProperties.siteKey === 'jd';
    json['informels'] = this.jahiaProperties.typeService === 'Les-Informels';
    return json;
  }

  initCadreOuJD(isEtudiantJD) {
    this.siteKey = isEtudiantJD ? 'jd' : 'cadres';
  }

  isServiceAtelier() {
    return this.jahiaProperties.scenario === 'atelier';
  }

  private initErrorMsgs(response: any) {
    this.idNomHeureErrorMsg = 'Vous devez sélectionner une date et heure de rendez-vous';
    this.form.setErrors({ 'errorBack': response });
    if (this.infoperso) {
      this.infoperso.initErrorMsgs(response);
      window.scroll(0, 0);
    }
  }
}
